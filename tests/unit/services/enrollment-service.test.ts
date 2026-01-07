/**
 * Enrollment Service Unit Tests
 * V2 API - Service functions for course enrollment lifecycle
 * 
 * Tests:
 * - startCourseEnrollment() - Create CourseEnrollmentCurrent
 * - updateCourseProgress() - Update progress in Current
 * - completeCourseEnrollment() - Move Current → Activity
 * - withdrawFromCourse() - Move Current → Activity with withdrawn status
 */

import mongoose from 'mongoose';
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
import {
  startCourseEnrollment,
  updateCourseProgress,
  completeCourseEnrollment,
  withdrawFromCourse,
} from '../../../utils/enrollmentService';

const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Enrollment Service', () => {
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
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
      name: 'Service Test Program',
      description: 'Program for service testing',
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

    // Create course
    const course = await Course.create({
      title: 'Service Test Course',
      description: 'Course for service testing',
      program: programId,
      programLevel: programLevelId,
      createdBy: masterAdminId,
    });
    courseId = course._id;

    // Create learner
    learnerId = new mongoose.Types.ObjectId();
    await User.create({
      _id: learnerId,
      email: 'service-learner@example.com',
      passwordHash: await hashPassword('Password123!'),
      roles: ['learner'],
      primaryRole: 'learner',
      status: 'active',
    });
    await Learner.create({
      _id: learnerId,
      name: { first: 'Service', last: 'Learner' },
      email: 'service-learner@example.com',
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
  });

  describe('startCourseEnrollment', () => {
    it('creates a CourseEnrollmentCurrent record', async () => {
      const result = await startCourseEnrollment(
        learnerId.toString(),
        courseId.toString(),
        programEnrollmentId.toString()
      );

      expect(result).toBeDefined();
      expect(result.learner.toString()).toBe(learnerId.toString());
      expect(result.course.toString()).toBe(courseId.toString());
      expect(result.progress).toBeDefined();
      expect(result.enrolledAt).toBeDefined();
    });

    it('initializes progress object correctly', async () => {
      const result = await startCourseEnrollment(
        learnerId.toString(),
        courseId.toString(),
        programEnrollmentId.toString()
      );

      expect(result.progress).toBeDefined();
    });

    it('throws error if learner already enrolled in course', async () => {
      await startCourseEnrollment(
        learnerId.toString(),
        courseId.toString(),
        programEnrollmentId.toString()
      );

      await expect(
        startCourseEnrollment(
          learnerId.toString(),
          courseId.toString(),
          programEnrollmentId.toString()
        )
      ).rejects.toThrow('already enrolled');
    });
  });

  describe('updateCourseProgress', () => {
    let currentEnrollmentId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      const enrollment = await startCourseEnrollment(
        learnerId.toString(),
        courseId.toString(),
        programEnrollmentId.toString()
      );
      currentEnrollmentId = enrollment._id;
    });

    it('updates progress fields', async () => {
      const result = await updateCourseProgress(currentEnrollmentId.toString(), {
        examAttempts: [{ examId: new mongoose.Types.ObjectId(), attemptNumber: 1 }],
      });

      expect(result.progress).toBeDefined();
    });

    it('updates lastActivityAt timestamp', async () => {
      const before = new Date();
      const result = await updateCourseProgress(currentEnrollmentId.toString(), {
        examAttempts: [],
      });

      expect(result.lastActivityAt).toBeDefined();
      expect(new Date(result.lastActivityAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('throws error for non-existent enrollment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      await expect(
        updateCourseProgress(fakeId.toString(), { examAttempts: [] })
      ).rejects.toThrow('not found');
    });
  });

  describe('completeCourseEnrollment', () => {
    let currentEnrollmentId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      const enrollment = await startCourseEnrollment(
        learnerId.toString(),
        courseId.toString(),
        programEnrollmentId.toString()
      );
      currentEnrollmentId = enrollment._id;
    });

    it('creates CourseEnrollmentActivity record', async () => {
      const result = await completeCourseEnrollment(
        currentEnrollmentId.toString(),
        'passed',
        95
      );

      expect(result).toBeDefined();
      expect(result.learner.toString()).toBe(learnerId.toString());
      expect(result.course.toString()).toBe(courseId.toString());
      expect(result.outcome).toBe('passed');
      expect(result.finalScoring?.percentage).toBe(95);
      expect(result.completedAt).toBeDefined();
    });

    it('deletes CourseEnrollmentCurrent record', async () => {
      await completeCourseEnrollment(currentEnrollmentId.toString(), 'passed', 90);

      const current = await CourseEnrollmentCurrent.findById(currentEnrollmentId);
      expect(current).toBeNull();
    });

    it('preserves enrolledAt from Current record', async () => {
      const current = await CourseEnrollmentCurrent.findById(currentEnrollmentId);
      const originalEnrolledAt = current!.enrolledAt;

      const result = await completeCourseEnrollment(
        currentEnrollmentId.toString(),
        'passed',
        85
      );

      expect(new Date(result.enrolledAt!).getTime()).toBe(new Date(originalEnrolledAt).getTime());
    });
  });

  describe('withdrawFromCourse', () => {
    let currentEnrollmentId: mongoose.Types.ObjectId;

    beforeEach(async () => {
      const enrollment = await startCourseEnrollment(
        learnerId.toString(),
        courseId.toString(),
        programEnrollmentId.toString()
      );
      currentEnrollmentId = enrollment._id;
    });

    it('creates CourseEnrollmentActivity with withdrawn outcome', async () => {
      const result = await withdrawFromCourse(
        currentEnrollmentId.toString(),
        'Personal reasons'
      );

      expect(result.outcome).toBe('withdrawn');
      expect(result.withdrawalReason).toBe('Personal reasons');
    });

    it('deletes CourseEnrollmentCurrent record', async () => {
      await withdrawFromCourse(currentEnrollmentId.toString(), 'Changed major');

      const current = await CourseEnrollmentCurrent.findById(currentEnrollmentId);
      expect(current).toBeNull();
    });

    it('sets completedAt as withdrawal date', async () => {
      const before = new Date();
      const result = await withdrawFromCourse(currentEnrollmentId.toString(), 'Reason');

      expect(result.completedAt).toBeDefined();
      expect(new Date(result.completedAt).getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
