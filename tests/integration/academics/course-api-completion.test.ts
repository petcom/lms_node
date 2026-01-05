import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import CourseContent from '../../../model/Academic/CourseContent';
import RenderedCourse from '../../../model/Content/RenderedCourse';
import Staff from '../../../model/Staff/Staff';

const adminToken = 'test-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Course API Completion Plan - Phase 1', () => {
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
  let instructorId: mongoose.Types.ObjectId;
  let instructor2Id: mongoose.Types.ObjectId;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Promise.all([
      Department.deleteMany({}),
      Program.deleteMany({}),
      ProgramLevel.deleteMany({}),
      Course.deleteMany({}),
      CourseContent.deleteMany({}),
      RenderedCourse.deleteMany({}),
      Staff.deleteMany({}),
    ]);

    await Department.create({
      _id: masterDepartmentId,
      name: 'Master Department',
      level: 'master',
      code: 'MASTER',
    });

    const program = await Program.create({
      name: 'Test Program',
      description: 'Program desc',
      duration: '4 years',
      createdBy: masterAdminId,
      department: masterDepartmentId,
    });
    programId = program._id;

    const programLevel = await ProgramLevel.create({
      program: programId,
      name: 'Level 1',
      description: 'Level desc',
      order: 1,
      department: masterDepartmentId,
      createdBy: masterAdminId,
      courses: [],
    });
    programLevelId = programLevel._id;

    // Create instructors
    const instructor = await Staff.create({
      name: { first: 'John', last: 'Smith' },
      email: 'john.smith@example.com',
      department: masterDepartmentId,
    });
    instructorId = instructor._id;

    const instructor2 = await Staff.create({
      name: { first: 'Jane', last: 'Doe' },
      email: 'jane.doe@example.com',
      department: masterDepartmentId,
    });
    instructor2Id = instructor2._id;
  });

  describe('1.1 getCourse with segments population', () => {
    beforeEach(async () => {
      const course = await Course.create({
        title: 'Course With Segments',
        description: 'Test course',
        program: programId,
        programLevel: programLevelId,
        department: masterDepartmentId,
        createdBy: masterAdminId,
        primaryInstructors: [instructorId],
      });
      courseId = course._id;

      // Create course content segments
      await CourseContent.create([
        {
          course: courseId,
          shortDescription: 'Module 1',
          longDescription: 'First module content',
          contentType: 'scorm',
          order: 1,
          createdBy: masterAdminId,
        },
        {
          course: courseId,
          shortDescription: 'Module 2',
          longDescription: 'Second module content',
          contentType: 'custom',
          order: 2,
          createdBy: masterAdminId,
        },
      ]);

      await ProgramLevel.findByIdAndUpdate(programLevelId, {
        $addToSet: { courses: courseId },
      });
    });

    it('should return course with populated segments array', async () => {
      const res = await request(app)
        .get(`/api/v1/courses/${courseId.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('segments');
      expect(Array.isArray(res.body.data.segments)).toBe(true);
      expect(res.body.data.segments.length).toBe(2);
    });

    it('should return segments ordered by order field', async () => {
      const res = await request(app)
        .get(`/api/v1/courses/${courseId.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.segments[0].order).toBe(1);
      expect(res.body.data.segments[1].order).toBe(2);
    });

    it('should include segment fields: _id, shortDescription, contentType, order', async () => {
      const res = await request(app)
        .get(`/api/v1/courses/${courseId.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const segment = res.body.data.segments[0];
      expect(segment).toHaveProperty('_id');
      expect(segment).toHaveProperty('shortDescription');
      expect(segment).toHaveProperty('contentType');
      expect(segment).toHaveProperty('order');
    });

    it('should return empty segments array when course has no content', async () => {
      const emptyCourse = await Course.create({
        title: 'Empty Course',
        description: 'No segments',
        program: programId,
        programLevel: programLevelId,
        department: masterDepartmentId,
        createdBy: masterAdminId,
      });

      const res = await request(app)
        .get(`/api/v1/courses/${emptyCourse._id.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.segments).toEqual([]);
    });
  });

  describe('1.2 Staff search by department', () => {
    it('should return staff list for a department', async () => {
      const res = await request(app)
        .get(`/api/v1/staff/by-department/${masterDepartmentId.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should return staff with required fields for instructor selector', async () => {
      const res = await request(app)
        .get(`/api/v1/staff/by-department/${masterDepartmentId.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const staff = res.body.data[0];
      expect(staff).toHaveProperty('_id');
      expect(staff).toHaveProperty('displayName');
      expect(staff).toHaveProperty('firstName');
      expect(staff).toHaveProperty('lastName');
      expect(staff).toHaveProperty('email');
    });

    it('should return empty array for department with no staff', async () => {
      // Create a new department with no staff
      const emptyDept = await Department.create({
        name: 'Empty Department',
        level: 'sub',
        code: 'EMPTY',
      });

      const res = await request(app)
        .get(`/api/v1/staff/by-department/${emptyDept._id.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 404 for non-existent department', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/staff/by-department/${fakeId.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('1.3 Instructor validation on publish', () => {
    beforeEach(async () => {
      // Create course without instructors
      const course = await Course.create({
        title: 'Course No Instructors',
        description: 'Test course',
        program: programId,
        programLevel: programLevelId,
        department: masterDepartmentId,
        createdBy: masterAdminId,
        status: 'rendered',
        primaryInstructors: [],
      });
      courseId = course._id;

      // Create rendered course (required for publish)
      // Using courseId field as per the RenderedCourse schema
      await RenderedCourse.create({
        courseId: courseId,
        contentVersion: new Date(),
        html: '<div>Rendered content</div>',
      });
    });

    it('should reject publish when no primary instructors', async () => {
      const res = await request(app)
        .patch(`/api/v1/courses/${courseId.toString()}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('primary instructor');
    });

    it('should allow publish when at least one primary instructor exists', async () => {
      // Add primary instructor
      await Course.findByIdAndUpdate(courseId, {
        $set: { primaryInstructors: [instructorId] },
      });

      const res = await request(app)
        .patch(`/api/v1/courses/${courseId.toString()}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('published');
    });

    it('should return proper error format with field reference', async () => {
      const res = await request(app)
        .patch(`/api/v1/courses/${courseId.toString()}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      // Check error format includes field reference
      expect(res.body.message).toMatch(/primary.*instructor/i);
    });
  });
});
