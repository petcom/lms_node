/**
 * Unified Course History Endpoint Tests
 * V2 API - GET /learners/:id/course-history
 * 
 * Combines CourseEnrollmentCurrent (active) and CourseEnrollmentActivity (completed/withdrawn)
 * 
 * Tests:
 * - Returns both active and completed courses
 * - Status filter works (active, completed, withdrawn, all)
 * - Program filter works
 * - Pagination works
 * - Learner can only see own history
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import Learner from '../../../model/Academic/Learner';
import User from '../../../model/Auth/User';
import ProgramEnrollment from '../../../model/Academic/ProgramEnrollment';
import CourseEnrollmentCurrent from '../../../model/Academic/CourseEnrollmentCurrent';
import CourseEnrollmentActivity from '../../../model/Academic/CourseEnrollmentActivity';
import { hashPassword } from '../../../utils/helpers';

const adminToken = 'test-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Unified Course History Endpoint', () => {
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let course1Id: mongoose.Types.ObjectId;
  let course2Id: mongoose.Types.ObjectId;
  let course3Id: mongoose.Types.ObjectId;
  let learnerId: mongoose.Types.ObjectId;
  let programEnrollmentId: mongoose.Types.ObjectId;

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
      Learner.deleteMany({}),
      User.deleteMany({}),
      ProgramEnrollment.deleteMany({}),
      CourseEnrollmentCurrent.deleteMany({}),
      CourseEnrollmentActivity.deleteMany({}),
    ]);

    // Create master department
    await Department.create({
      _id: masterDepartmentId,
      name: 'Master Department',
      level: 'master',
      code: 'MASTER',
    });

    // Create program
    const program = await Program.create({
      name: 'Test Program',
      description: 'Test program description',
      duration: '4 years',
      createdBy: masterAdminId,
      department: masterDepartmentId,
    });
    programId = program._id;

    // Create program level
    const programLevel = await ProgramLevel.create({
      program: programId,
      name: 'Year 1',
      description: 'First year',
      order: 1,
      department: masterDepartmentId,
      createdBy: masterAdminId,
    });
    programLevelId = programLevel._id;

    // Create 3 courses
    const course1 = await Course.create({
      title: 'Course 1 - Active',
      description: 'Currently active course',
      program: programId,
      programLevel: programLevelId,
      createdBy: masterAdminId,
    });
    course1Id = course1._id;

    const course2 = await Course.create({
      title: 'Course 2 - Completed',
      description: 'Already completed course',
      program: programId,
      programLevel: programLevelId,
      createdBy: masterAdminId,
    });
    course2Id = course2._id;

    const course3 = await Course.create({
      title: 'Course 3 - Withdrawn',
      description: 'Withdrawn course',
      program: programId,
      programLevel: programLevelId,
      createdBy: masterAdminId,
    });
    course3Id = course3._id;

    // Create learner
    learnerId = new mongoose.Types.ObjectId();
    await User.create({
      _id: learnerId,
      email: 'history-learner@example.com',
      passwordHash: await hashPassword('Password123!'),
      roles: ['learner'],
      primaryRole: 'learner',
      status: 'active',
    });
    await Learner.create({
      _id: learnerId,
      name: { first: 'History', last: 'Learner' },
      email: 'history-learner@example.com',
      globalStatus: 'active',
    });

    // Create program enrollment
    const pe = await ProgramEnrollment.create({
      learner: learnerId,
      program: programId,
      status: 'enrolled',
      enrolledAt: new Date(),
    });
    programEnrollmentId = pe._id;

    // Create active course enrollment (CourseEnrollmentCurrent)
    await CourseEnrollmentCurrent.create({
      learner: learnerId,
      course: course1Id,
      programEnrollment: programEnrollmentId,
      status: 'active',
      progress: { overall: 50 },
      startedAt: new Date(),
    });

    // Create completed course enrollment (CourseEnrollmentActivity)
    await CourseEnrollmentActivity.create({
      learner: learnerId,
      course: course2Id,
      programEnrollment: programEnrollmentId,
      outcome: 'passed',
      enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    });

    // Create withdrawn course enrollment (CourseEnrollmentActivity)
    await CourseEnrollmentActivity.create({
      learner: learnerId,
      course: course3Id,
      programEnrollment: programEnrollmentId,
      outcome: 'withdrawn',
      enrolledAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      completedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
    });
  });

  describe('GET /api/v1/learners/:id/course-history', () => {
    it('returns combined current and activity enrollments', async () => {
      const res = await request(app)
        .get(`/api/v1/learners/${learnerId}/course-history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      
      // Should have 1 active, 1 passed, 1 withdrawn
      const statuses = res.body.data.map((e: any) => e.status || e.outcome);
      expect(statuses).toContain('active');
      expect(statuses).toContain('passed');
      expect(statuses).toContain('withdrawn');
    });

    it('filters by status=active', async () => {
      const res = await request(app)
        .get(`/api/v1/learners/${learnerId}/course-history?status=active`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('active');
    });

    it('filters by status=passed', async () => {
      const res = await request(app)
        .get(`/api/v1/learners/${learnerId}/course-history?status=passed`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].outcome).toBe('passed');
    });

    it('filters by status=withdrawn', async () => {
      const res = await request(app)
        .get(`/api/v1/learners/${learnerId}/course-history?status=withdrawn`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].outcome).toBe('withdrawn');
    });

    it('supports pagination', async () => {
      const res = await request(app)
        .get(`/api/v1/learners/${learnerId}/course-history?page=1&limit=2`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.pages).toBe(2);
    });

    it('filters by programId', async () => {
      // Create another program and course to verify filter
      const program2 = await Program.create({
        name: 'Other Program',
        description: 'Other program',
        duration: '2 years',
        createdBy: masterAdminId,
        department: masterDepartmentId,
      });

      const pe2 = await ProgramEnrollment.create({
        learner: learnerId,
        program: program2._id,
        status: 'enrolled',
        enrolledAt: new Date(),
      });

      const course4 = await Course.create({
        title: 'Course 4 - Other Program',
        description: 'Course in other program',
        program: program2._id,
        createdBy: masterAdminId,
      });

      await CourseEnrollmentCurrent.create({
        learner: learnerId,
        course: course4._id,
        programEnrollment: pe2._id,
        status: 'active',
        progress: { overall: 0 },
        startedAt: new Date(),
      });

      // Get all - should have 4
      const allRes = await request(app)
        .get(`/api/v1/learners/${learnerId}/course-history`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(allRes.body.data).toHaveLength(4);

      // Filter by original program - should have 3
      const filteredRes = await request(app)
        .get(`/api/v1/learners/${learnerId}/course-history?programId=${programId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.data).toHaveLength(3);
    });

    it('returns 404 for non-existent learner', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/learners/${fakeId}/course-history`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
