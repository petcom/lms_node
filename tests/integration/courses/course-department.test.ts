/**
 * Course Department Convenience Field Tests
 * V2 API - Course responses should include department as convenience field
 * 
 * Tests:
 * - GET /courses/:id returns department derived from program
 * - GET /courses list includes department for each course
 * - Null department is handled gracefully
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import User from '../../../model/Auth/User';

const adminToken = 'test-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Course Department Convenience Field', () => {
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
  let secondDepartmentId: mongoose.Types.ObjectId;

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
      User.deleteMany({}),
    ]);

    // Create master department
    await Department.create({
      _id: masterDepartmentId,
      name: 'Master Department',
      level: 'master',
      code: 'MASTER',
    });

    // Create second department
    secondDepartmentId = new mongoose.Types.ObjectId();
    await Department.create({
      _id: secondDepartmentId,
      name: 'Science Department',
      level: 'top',
      code: 'SCI',
    });

    // Create program with department
    const program = await Program.create({
      name: 'Science Program',
      description: 'Science program description',
      duration: '4 years',
      createdBy: masterAdminId,
      department: secondDepartmentId,
    });
    programId = program._id;

    // Create program level
    const programLevel = await ProgramLevel.create({
      program: programId,
      name: 'Year 1',
      description: 'First year',
      order: 1,
      department: secondDepartmentId,
      createdBy: masterAdminId,
    });
    programLevelId = programLevel._id;

    // Create course
    const course = await Course.create({
      title: 'Introduction to Science',
      description: 'Intro course',
      program: programId,
      programLevel: programLevelId,
      createdBy: masterAdminId,
    });
    courseId = course._id;
  });

  describe('GET /api/v1/courses/:id', () => {
    it('returns department as convenience field derived from program', async () => {
      const res = await request(app)
        .get(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('department');
      expect(res.body.data.department).toHaveProperty('_id');
      expect(res.body.data.department).toHaveProperty('name');
      expect(res.body.data.department._id.toString()).toBe(secondDepartmentId.toString());
      expect(res.body.data.department.name).toBe('Science Department');
    });

    it('handles course with null program gracefully', async () => {
      // Create a course and manually remove its program reference
      // This simulates edge case where course has no program
      const courseNoDept = await Course.create({
        title: 'Course No Program',
        description: 'Course without program reference',
        program: programId,  // Create with valid program first
        createdBy: masterAdminId,
      });
      
      // Manually remove the program reference to simulate edge case
      await Course.updateOne({ _id: courseNoDept._id }, { $unset: { program: 1 } });

      const res = await request(app)
        .get(`/api/v1/courses/${courseNoDept._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.department).toBeNull();
    });
  });

  describe('GET /api/v1/courses', () => {
    beforeEach(async () => {
      // Create additional courses
      await Course.create({
        title: 'Advanced Science',
        description: 'Advanced course',
        program: programId,
        programLevel: programLevelId,
        createdBy: masterAdminId,
      });
    });

    it('returns department for each course in list', async () => {
      const res = await request(app)
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      
      // Each course should have department info
      res.body.data.forEach((course: any) => {
        expect(course).toHaveProperty('department');
        if (course.department) {
          expect(course.department).toHaveProperty('_id');
          expect(course.department).toHaveProperty('name');
        }
      });
    });
  });
});
