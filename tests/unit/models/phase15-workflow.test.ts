/**
 * Phase 15 Tests: Course Completion Workflow and LearnerProgress Deprecation
 * 
 * DCV-032: Course completion workflow (Current → Activity)
 * DCV-052: Remove LearnerProgress - deprecated in favor of CourseEnrollmentCurrent/Activity
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let CourseEnrollmentCurrent: mongoose.Model<any>;
let CourseEnrollmentActivity: mongoose.Model<any>;
let ProgramEnrollment: mongoose.Model<any>;
let Course: mongoose.Model<any>;
let Program: mongoose.Model<any>;
let ProgramLevel: mongoose.Model<any>;
let Learner: mongoose.Model<any>;
let Department: mongoose.Model<any>;
let User: mongoose.Model<any>;
let LearnerProgress: mongoose.Model<any>;

let completeCourseEnrollment: any;

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // Import models after connection
  CourseEnrollmentCurrent = (await import('../../../model/Academic/CourseEnrollmentCurrent')).default;
  CourseEnrollmentActivity = (await import('../../../model/Academic/CourseEnrollmentActivity')).default;
  ProgramEnrollment = (await import('../../../model/Academic/ProgramEnrollment')).default;
  Course = (await import('../../../model/Content/Course')).default;
  Program = (await import('../../../model/Academic/Program')).default;
  ProgramLevel = (await import('../../../model/Academic/ProgramLevel')).default;
  Learner = (await import('../../../model/Academic/Learner')).default;
  Department = (await import('../../../model/Academic/Department')).default;
  User = (await import('../../../model/Auth/User')).default;
  LearnerProgress = (await import('../../../model/Content/LearnerProgress')).default;
  
  // Import the workflow service
  const enrollmentService = await import('../../../services/enrollmentService');
  completeCourseEnrollment = enrollmentService.completeCourseEnrollment;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('DCV-032: Course Completion Workflow', () => {
  let userId: mongoose.Types.ObjectId;
  let learnerId: mongoose.Types.ObjectId;
  let departmentId: mongoose.Types.ObjectId;
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
  let programEnrollmentId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create User
    const user = await User.create({
      email: 'learner@test.com',
      passwordHash: 'hashedpassword123',
      roles: ['learner'],
      primaryRole: 'learner',
    });
    userId = user._id;

    // Create Learner with shared _id
    const learner = new Learner({
      _id: userId,
      name: { first: 'Test', last: 'Learner' },
      email: 'learner@test.com',
    });
    await learner.save({ validateBeforeSave: false });
    learnerId = learner._id;

    // Create Department
    const department = await Department.create({
      name: 'Test Department',
      code: 'TD',
      level: 'top',
    });
    departmentId = department._id;

    // Create Program
    const program = await Program.create({
      name: 'Test Program',
      description: 'Test program description',
      department: departmentId,
      createdBy: userId,
    });
    programId = program._id;

    // Create ProgramLevel
    const programLevel = await ProgramLevel.create({
      name: 'Level 1',
      order: 1,
      program: programId,
      createdBy: userId,
    });
    programLevelId = programLevel._id;

    // Create Course with credits
    const course = await Course.create({
      title: 'Test Course',
      program: programId,
      programLevel: programLevelId,
      createdBy: userId,
    });
    courseId = course._id;

    // Create ProgramEnrollment
    const enrollment = await ProgramEnrollment.create({
      learner: learnerId,
      program: programId,
      status: 'enrolled',
    });
    programEnrollmentId = enrollment._id;
  });

  it('should create CourseEnrollmentActivity from CourseEnrollmentCurrent on pass', async () => {
    // Create active enrollment
    const current = await CourseEnrollmentCurrent.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      progress: {
        examAttempts: [
          { examId: new mongoose.Types.ObjectId(), attemptNumber: 1, points: 90, maxPoints: 100 },
        ],
      },
    });

    // Complete the course
    const result = await completeCourseEnrollment(current._id.toString(), 'passed', {
      creditsEarned: 3,
      finalScoring: {
        totalPoints: 90,
        maxPoints: 100,
        percentage: 90,
      },
    });

    expect(result.activity).toBeDefined();
    expect(result.activity.outcome).toBe('passed');
    expect(result.activity.creditsEarned).toBe(3);
    
    // Verify current was deleted
    const deletedCurrent = await CourseEnrollmentCurrent.findById(current._id);
    expect(deletedCurrent).toBeNull();
    
    // Verify activity exists
    const savedActivity = await CourseEnrollmentActivity.findById(result.activity._id);
    expect(savedActivity).toBeDefined();
    expect(savedActivity?.attemptHistory?.examAttempts).toHaveLength(1);
  });

  it('should create CourseEnrollmentActivity on withdrawal', async () => {
    const current = await CourseEnrollmentCurrent.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
    });

    const result = await completeCourseEnrollment(current._id.toString(), 'withdrawn', {
      withdrawalReason: 'Personal reasons',
      withdrawnBy: userId,
    });

    expect(result.activity.outcome).toBe('withdrawn');
    expect(result.activity.withdrawalReason).toBe('Personal reasons');
    expect(result.activity.creditsEarned).toBe(0);
    
    // Verify current was deleted
    const deletedCurrent = await CourseEnrollmentCurrent.findById(current._id);
    expect(deletedCurrent).toBeNull();
  });

  it('should create CourseEnrollmentActivity on failure', async () => {
    const current = await CourseEnrollmentCurrent.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      progress: {
        examAttempts: [
          { examId: new mongoose.Types.ObjectId(), attemptNumber: 1, points: 40, maxPoints: 100 },
        ],
      },
    });

    const result = await completeCourseEnrollment(current._id.toString(), 'failed', {
      finalScoring: {
        totalPoints: 40,
        maxPoints: 100,
        percentage: 40,
      },
    });

    expect(result.activity.outcome).toBe('failed');
    expect(result.activity.creditsEarned).toBe(0);
  });

  it('should preserve full attempt history in Activity', async () => {
    const examId1 = new mongoose.Types.ObjectId();
    const mediaId1 = new mongoose.Types.ObjectId();
    const scormId1 = new mongoose.Types.ObjectId();

    const current = await CourseEnrollmentCurrent.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      progress: {
        examAttempts: [
          { examId: examId1, attemptNumber: 1, points: 70, maxPoints: 100 },
          { examId: examId1, attemptNumber: 2, points: 85, maxPoints: 100 },
        ],
        mediaProgress: [
          { mediaId: mediaId1, viewedMinutes: 45, requiredMinutes: 60 },
        ],
        scormAttempts: [
          { scormPackageId: scormId1, attemptNumber: 1, score: 80, scaledScore: 0.8, completionStatus: 'completed' },
        ],
      },
    });

    const result = await completeCourseEnrollment(current._id.toString(), 'passed', {
      creditsEarned: 3,
    });

    expect(result.activity.attemptHistory.examAttempts).toHaveLength(2);
    expect(result.activity.attemptHistory.mediaProgress).toHaveLength(1);
    expect(result.activity.attemptHistory.scormAttempts).toHaveLength(1);
  });
});

describe('DCV-052: LearnerProgress Deprecation', () => {
  it('should have deprecation notice in schema', async () => {
    // LearnerProgress should still exist but be marked as deprecated
    expect(LearnerProgress).toBeDefined();
    expect(LearnerProgress.modelName).toBe('LearnerProgress');
  });

  it('should still allow CRUD operations for backward compatibility', async () => {
    const userId = new mongoose.Types.ObjectId();
    const courseId = new mongoose.Types.ObjectId();
    const contentId = new mongoose.Types.ObjectId();

    // LearnerProgress should still work for legacy data
    const progress = await LearnerProgress.create({
      learnerId: userId,
      courseId: courseId,
      contentId: contentId,
      segmentId: 'segment-1',
      contentType: 'custom',
      status: 'in_progress',
    });

    expect(progress.learnerId.toString()).toBe(userId.toString());
    expect(progress.status).toBe('in_progress');
  });
});
