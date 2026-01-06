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
import User from '../../../model/Auth/User';
import { hashPassword } from '../../../utils/helpers';

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
      User.deleteMany({}),
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
      // DCV-044: department removed from ProgramLevel
      createdBy: masterAdminId,
      courses: [],
    });
    programLevelId = programLevel._id;

    // Create User FIRST (required by personValidation middleware)
    const instructor1Id = new mongoose.Types.ObjectId();
    await User.create({
      _id: instructor1Id,
      email: 'john.smith@example.com',
      passwordHash: await hashPassword('Password123!'),
      roles: ['staff'],
      primaryRole: 'staff',
      status: 'active',
    });
    // THEN create Staff with same _id
    // DCV-021: email removed from Staff (derived from User)
    // DCV-022: department replaced with departmentMemberships
    const instructor = await Staff.create({
      _id: instructor1Id,
      name: { first: 'John', last: 'Smith' },
      departmentMemberships: [{ departmentId: masterDepartmentId, roles: ['instructor'] }],
    });
    instructorId = instructor._id;

    // Create User FIRST (required by personValidation middleware)
    const instructor2IdLocal = new mongoose.Types.ObjectId();
    await User.create({
      _id: instructor2IdLocal,
      email: 'jane.doe@example.com',
      passwordHash: await hashPassword('Password123!'),
      roles: ['staff'],
      primaryRole: 'staff',
      status: 'active',
    });
    // THEN create Staff with same _id
    // DCV-021: email removed from Staff (derived from User)
    // DCV-022: department replaced with departmentMemberships
    await Staff.create({
      _id: instructor2IdLocal,
      name: { first: 'Jane', last: 'Doe' },
      departmentMemberships: [{ departmentId: masterDepartmentId, roles: ['instructor'] }],
    });
  });

  describe('1.1 getCourse with segments population', () => {
    beforeEach(async () => {
      const course = await Course.create({
        title: 'Course With Segments',
        description: 'Test course',
        program: programId,
        programLevel: programLevelId,
        // DCV-044: department removed from Course - inherits from Program
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
        // DCV-044: department removed from Course
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
        // DCV-044: department removed from Course
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

  describe('Phase 2: HTTP Method Aliases', () => {
    beforeEach(async () => {
      const course = await Course.create({
        title: 'Alias Test Course',
        description: 'Test course for HTTP method aliases',
        program: programId,
        programLevel: programLevelId,
        // DCV-044: department removed from Course
        createdBy: masterAdminId,
        primaryInstructors: [instructorId],
      });
      courseId = course._id;

      await ProgramLevel.findByIdAndUpdate(programLevelId, {
        $addToSet: { courses: courseId },
      });
    });

    describe('2.1 PATCH alias for course update', () => {
      it('should update course using PATCH method', async () => {
        const res = await request(app)
          .patch(`/api/v1/courses/${courseId.toString()}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Updated via PATCH' });

        expect(res.status).toBe(200);
        expect(res.body.data.title).toBe('Updated via PATCH');
      });

      it('should update course using PUT method (existing)', async () => {
        const res = await request(app)
          .put(`/api/v1/courses/${courseId.toString()}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: 'Updated via PUT' });

        expect(res.status).toBe(200);
        expect(res.body.data.title).toBe('Updated via PUT');
      });
    });

    describe('2.2 POST aliases for publish/unpublish', () => {
      beforeEach(async () => {
        // Set course to rendered status
        await Course.findByIdAndUpdate(courseId, { status: 'rendered' });
        await RenderedCourse.create({
          courseId: courseId,
          contentVersion: new Date(),
          html: '<div>Content</div>',
        });
      });

      it('should publish course using POST method', async () => {
        const res = await request(app)
          .post(`/api/v1/courses/${courseId.toString()}/publish`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('published');
      });

      it('should publish course using PATCH method (existing)', async () => {
        const res = await request(app)
          .patch(`/api/v1/courses/${courseId.toString()}/publish`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('published');
      });

      it('should unpublish course using POST method', async () => {
        // First publish
        await Course.findByIdAndUpdate(courseId, {
          status: 'published',
          publishedAt: new Date(),
        });

        const res = await request(app)
          .post(`/api/v1/courses/${courseId.toString()}/unpublish`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('rendered');
      });

      it('should unpublish course using PATCH method (existing)', async () => {
        // First publish
        await Course.findByIdAndUpdate(courseId, {
          status: 'published',
          publishedAt: new Date(),
        });

        const res = await request(app)
          .patch(`/api/v1/courses/${courseId.toString()}/unpublish`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('rendered');
      });
    });
  });

  describe('Phase 3: Validation Updates', () => {
    describe('3.1 Increased description field limits', () => {
      it('should accept shortDescription up to 500 characters', async () => {
        const longShortDesc = 'A'.repeat(500);
        const res = await request(app)
          .post('/api/v1/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Course with long short desc',
            shortDescription: longShortDesc,
            program: programId.toString(),
          });

        expect(res.status).toBe(201);
        expect(res.body.data.shortDescription).toBe(longShortDesc);
      });

      it('should reject shortDescription over 500 characters', async () => {
        const tooLongShortDesc = 'A'.repeat(501);
        const res = await request(app)
          .post('/api/v1/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Course with too long short desc',
            shortDescription: tooLongShortDesc,
            program: programId.toString(),
          });

        expect(res.status).toBe(400);
      });

      it('should accept longDescription up to 5000 characters', async () => {
        const longDesc = 'B'.repeat(5000);
        const res = await request(app)
          .post('/api/v1/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Course with long desc',
            longDescription: longDesc,
            program: programId.toString(),
          });

        expect(res.status).toBe(201);
        expect(res.body.data.longDescription).toBe(longDesc);
      });

      it('should reject longDescription over 5000 characters', async () => {
        const tooLongDesc = 'B'.repeat(5001);
        const res = await request(app)
          .post('/api/v1/courses')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            title: 'Course with too long desc',
            longDescription: tooLongDesc,
            program: programId.toString(),
          });

        expect(res.status).toBe(400);
      });
    });
  });
});
