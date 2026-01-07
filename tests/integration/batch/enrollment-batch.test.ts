/**
 * Batch Enrollment API Tests
 * TDD tests for batch enrollment endpoints (V2 API)
 * 
 * Tests:
 * - POST /program-enrollments/batch - Batch create program enrollments (max 100)
 * - POST /class-enrollments/batch - Batch create class enrollments (max 100)
 * - POST /course-enrollments/batch - Batch create course enrollments (max 100)
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import ClassModel from '../../../model/Academic/Class';
import Course from '../../../model/Content/Course';
import Learner from '../../../model/Academic/Learner';
import ProgramEnrollment from '../../../model/Academic/ProgramEnrollment';
import ClassEnrollment from '../../../model/Academic/ClassEnrollment';
import CourseEnrollmentCurrent from '../../../model/Academic/CourseEnrollmentCurrent';
import User from '../../../model/Auth/User';
import { hashPassword } from '../../../utils/helpers';

const adminToken = 'test-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Batch Enrollment APIs', () => {
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let classId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
  let learnerIds: mongoose.Types.ObjectId[];

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
      ClassModel.deleteMany({}),
      Course.deleteMany({}),
      Learner.deleteMany({}),
      User.deleteMany({}),
      ProgramEnrollment.deleteMany({}),
      ClassEnrollment.deleteMany({}),
      CourseEnrollmentCurrent.deleteMany({}),
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
      name: 'Batch Test Program',
      description: 'Program for batch testing',
      duration: '4 years',
      createdBy: masterAdminId,
      department: masterDepartmentId,
    });
    programId = program._id;

    // Create program level
    const programLevel = await ProgramLevel.create({
      program: programId,
      name: 'Level 1',
      description: 'First level',
      order: 1,
      department: masterDepartmentId,
      createdBy: masterAdminId,
    });
    programLevelId = programLevel._id;

    // Create class
    const classDoc = await ClassModel.create({
      name: 'Batch Test Cohort',
      program: programId,
      programLevel: programLevelId,
      department: masterDepartmentId,
      createdBy: masterAdminId,
    });
    classId = classDoc._id;

    // Create course
    const course = await Course.create({
      title: 'Batch Test Course',
      description: 'Course for batch testing',
      program: programId,
      programLevel: programLevelId,
      department: masterDepartmentId,
      createdBy: masterAdminId,
    });
    courseId = course._id;

    // Create 5 learners for batch testing
    learnerIds = [];
    for (let i = 0; i < 5; i++) {
      const learnerId = new mongoose.Types.ObjectId();
      await User.create({
        _id: learnerId,
        email: `batch-learner-${i}@example.com`,
        passwordHash: await hashPassword('Password123!'),
        roles: ['learner'],
        primaryRole: 'learner',
        status: 'active',
      });
      await Learner.create({
        _id: learnerId,
        name: { first: 'Batch', last: `Learner${i}` },
        email: `batch-learner-${i}@example.com`,
        globalStatus: 'active',
      });
      learnerIds.push(learnerId);
    }
  });

  describe('POST /api/v1/program-enrollments/batch', () => {
    it('creates multiple program enrollments in a single request', async () => {
      const enrollments = learnerIds.slice(0, 3).map((learnerId) => ({
        learner: learnerId.toString(),
        program: programId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/program-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(207); // Multi-Status
      expect(res.body.status).toBe('success');
      expect(res.body.data.created).toHaveLength(3);
      expect(res.body.data.failed).toHaveLength(0);
      expect(res.body.data.summary.total).toBe(3);
      expect(res.body.data.summary.succeeded).toBe(3);
      expect(res.body.data.summary.failed).toBe(0);
    });

    it('returns 400 when batch size exceeds 100', async () => {
      const enrollments = Array.from({ length: 101 }, () => ({
        learner: new mongoose.Types.ObjectId().toString(),
        program: programId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/program-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('100');
    });

    it('handles partial success with duplicate enrollments', async () => {
      // Create one enrollment first
      await ProgramEnrollment.create({
        learner: learnerIds[0],
        program: programId,
        status: 'enrolled',
        enrolledAt: new Date(),
      });

      // Try to batch create including the duplicate
      const enrollments = learnerIds.slice(0, 3).map((learnerId) => ({
        learner: learnerId.toString(),
        program: programId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/program-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(207);
      expect(res.body.data.created).toHaveLength(2);
      expect(res.body.data.failed).toHaveLength(1);
      expect(res.body.data.failed[0].reason).toContain('already enrolled');
    });

    it('validates all learner IDs exist', async () => {
      const invalidLearnerId = new mongoose.Types.ObjectId();
      const enrollments = [
        { learner: learnerIds[0].toString(), program: programId.toString() },
        { learner: invalidLearnerId.toString(), program: programId.toString() },
      ];

      const res = await request(app)
        .post('/api/v1/program-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(207);
      expect(res.body.data.created).toHaveLength(1);
      expect(res.body.data.failed).toHaveLength(1);
      expect(res.body.data.failed[0].reason).toContain('Learner not found');
    });

    it('validates program ID exists', async () => {
      const invalidProgramId = new mongoose.Types.ObjectId();
      const enrollments = [
        { learner: learnerIds[0].toString(), program: invalidProgramId.toString() },
      ];

      const res = await request(app)
        .post('/api/v1/program-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(207);
      expect(res.body.data.failed).toHaveLength(1);
      expect(res.body.data.failed[0].reason).toContain('Program not found');
    });

    it('requires global-admin role', async () => {
      const res = await request(app)
        .post('/api/v1/program-enrollments/batch')
        .set('Authorization', 'Bearer test-instructor-token')
        .send({ enrollments: [] });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/class-enrollments/batch', () => {
    it('creates multiple class enrollments in a single request', async () => {
      const enrollments = learnerIds.slice(0, 3).map((learnerId) => ({
        learner: learnerId.toString(),
        classId: classId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/class-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(207);
      expect(res.body.data.created).toHaveLength(3);
      expect(res.body.data.failed).toHaveLength(0);
    });

    it('returns 400 when batch size exceeds 100', async () => {
      const enrollments = Array.from({ length: 101 }, () => ({
        learner: new mongoose.Types.ObjectId().toString(),
        classId: classId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/class-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(400);
    });

    it('handles duplicate class enrollments', async () => {
      // Create one enrollment first using correct field names
      await ClassEnrollment.create({
        learner: learnerIds[0],
        class: classId,
        program: programId,
        programLevel: programLevelId,
        enrolledAt: new Date(),
      });

      const enrollments = learnerIds.slice(0, 2).map((learnerId) => ({
        learner: learnerId.toString(),
        classId: classId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/class-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(207);
      expect(res.body.data.created).toHaveLength(1);
      expect(res.body.data.failed).toHaveLength(1);
    });
  });

  describe('POST /api/v1/course-enrollments/batch', () => {
    let programEnrollmentId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      // Create program enrollment required for course enrollment
      const pe = await ProgramEnrollment.create({
        learner: learnerIds[0],
        program: programId,
        status: 'enrolled',
        enrolledAt: new Date(),
      });
      programEnrollmentId = pe._id;

      // Create additional program enrollments for other learners
      for (let i = 1; i < learnerIds.length; i++) {
        await ProgramEnrollment.create({
          learner: learnerIds[i],
          program: programId,
          status: 'enrolled',
          enrolledAt: new Date(),
        });
      }
    });

    it('creates multiple course enrollments in a single request', async () => {
      const enrollments = learnerIds.slice(0, 3).map((learnerId) => ({
        learner: learnerId.toString(),
        course: courseId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/course-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(207);
      expect(res.body.data.created).toHaveLength(3);
      expect(res.body.data.failed).toHaveLength(0);
    });

    it('returns 400 when batch size exceeds 100', async () => {
      const enrollments = Array.from({ length: 101 }, () => ({
        learner: new mongoose.Types.ObjectId().toString(),
        course: courseId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/course-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(400);
    });

    it('handles duplicate course enrollments', async () => {
      // Create one enrollment first
      await CourseEnrollmentCurrent.create({
        learner: learnerIds[0],
        course: courseId,
        programEnrollment: programEnrollmentId,
        status: 'active',
        progress: { overall: 0 },
        startedAt: new Date(),
      });

      const enrollments = learnerIds.slice(0, 2).map((learnerId) => ({
        learner: learnerId.toString(),
        course: courseId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/course-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(207);
      expect(res.body.data.created).toHaveLength(1);
      expect(res.body.data.failed).toHaveLength(1);
    });
  });

  describe('Batch of exactly 100 items', () => {
    beforeEach(async () => {
      // Create additional learners for max batch test (already have 5)
      // Use Promise.all for faster creation
      const createPromises = [];
      for (let i = 5; i < 100; i++) {
        const learnerId = new mongoose.Types.ObjectId();
        createPromises.push(
          (async () => {
            await User.create({
              _id: learnerId,
              email: `batch-max-learner-${i}@example.com`,
              passwordHash: await hashPassword('Password123!'),
              roles: ['learner'],
              primaryRole: 'learner',
              status: 'active',
            });
            await Learner.create({
              _id: learnerId,
              name: { first: 'BatchMax', last: `Learner${i}` },
              email: `batch-max-learner-${i}@example.com`,
              learnerId: `LRN-BATCH-${i.toString().padStart(3, '0')}`,
              globalStatus: 'active',
            });
            return learnerId;
          })()
        );
      }
      const newLearnerIds = await Promise.all(createPromises);
      learnerIds.push(...newLearnerIds);
    }, 30000); // 30 second timeout for bulk creation

    it('accepts exactly 100 program enrollments', async () => {
      const enrollments = learnerIds.slice(0, 100).map((learnerId) => ({
        learner: learnerId.toString(),
        program: programId.toString(),
      }));

      const res = await request(app)
        .post('/api/v1/program-enrollments/batch')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enrollments });

      expect(res.status).toBe(207);
      expect(res.body.data.summary.total).toBe(100);
      expect(res.body.data.summary.succeeded).toBe(100);
    });
  });
});
