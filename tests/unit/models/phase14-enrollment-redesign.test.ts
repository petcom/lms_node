/**
 * Phase 14 Tests: Enrollment System Redesign
 * 
 * DCV-026: Redesign ProgramEnrollment with status history + credentialGoal
 * DCV-027: Create CourseEnrollmentCurrent model
 * DCV-028: Create CourseEnrollmentActivity model
 * DCV-029: Remove Learner.programEnrolmentStatuses
 * DCV-032: Course completion workflow
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let ProgramEnrollment: mongoose.Model<any>;
let CourseEnrollmentCurrent: mongoose.Model<any>;
let CourseEnrollmentActivity: mongoose.Model<any>;
let Program: mongoose.Model<any>;
let ProgramLevel: mongoose.Model<any>;
let Course: mongoose.Model<any>;
let Credential: mongoose.Model<any>;
let Learner: mongoose.Model<any>;
let Department: mongoose.Model<any>;
let User: mongoose.Model<any>;

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // Import models after connection
  ProgramEnrollment = (await import('../../../model/Academic/ProgramEnrollment')).default;
  CourseEnrollmentCurrent = (await import('../../../model/Academic/CourseEnrollmentCurrent')).default;
  CourseEnrollmentActivity = (await import('../../../model/Academic/CourseEnrollmentActivity')).default;
  Program = (await import('../../../model/Academic/Program')).default;
  ProgramLevel = (await import('../../../model/Academic/ProgramLevel')).default;
  Course = (await import('../../../model/Content/Course')).default;
  Credential = (await import('../../../model/Academic/Credential')).default;
  Learner = (await import('../../../model/Academic/Learner')).default;
  Department = (await import('../../../model/Academic/Department')).default;
  User = (await import('../../../model/Auth/User')).default;
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

describe('DCV-026: ProgramEnrollment Redesign', () => {
  let userId: mongoose.Types.ObjectId;
  let learnerId: mongoose.Types.ObjectId;
  let departmentId: mongoose.Types.ObjectId;
  let programId: mongoose.Types.ObjectId;
  let credentialId: mongoose.Types.ObjectId;

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

    // Create Credential
    const credential = await Credential.create({
      name: 'Certificate in Testing',
      type: 'certificate',
      program: programId,
      createdBy: userId,
    });
    credentialId = credential._id;
  });

  it('should have credentialGoal field with enum values', async () => {
    const enrollment = await ProgramEnrollment.create({
      learner: learnerId,
      program: programId,
      credentialGoal: 'certificate',
    });

    expect(enrollment.credentialGoal).toBe('certificate');
  });

  it('should default credentialGoal to none', async () => {
    const enrollment = await ProgramEnrollment.create({
      learner: learnerId,
      program: programId,
    });

    expect(enrollment.credentialGoal).toBe('none');
  });

  it('should support credentialGoal values: certificate, degree, none', async () => {
    const goals = ['certificate', 'degree', 'none'];
    
    for (let i = 0; i < goals.length; i++) {
      await mongoose.connection.collections.programenrollments?.deleteMany({});
      const enrollment = await ProgramEnrollment.create({
        learner: learnerId,
        program: programId,
        credentialGoal: goals[i],
      });
      expect(enrollment.credentialGoal).toBe(goals[i]);
    }
  });

  it('should have targetCredential reference', async () => {
    const enrollment = await ProgramEnrollment.create({
      learner: learnerId,
      program: programId,
      credentialGoal: 'certificate',
      targetCredential: credentialId,
    });

    expect(enrollment.targetCredential.toString()).toBe(credentialId.toString());
  });

  it('should have expanded status enum', async () => {
    const statuses = ['applied', 'enrolled', 'on-leave', 'withdrawn', 'completed'];
    
    for (let i = 0; i < statuses.length; i++) {
      await mongoose.connection.collections.programenrollments?.deleteMany({});
      const enrollment = await ProgramEnrollment.create({
        learner: learnerId,
        program: programId,
        status: statuses[i],
      });
      expect(enrollment.status).toBe(statuses[i]);
    }
  });

  it('should default status to applied', async () => {
    const enrollment = await ProgramEnrollment.create({
      learner: learnerId,
      program: programId,
    });

    expect(enrollment.status).toBe('applied');
  });

  it('should have statusHistory array', async () => {
    const enrollment = await ProgramEnrollment.create({
      learner: learnerId,
      program: programId,
      statusHistory: [
        { status: 'applied', reason: 'Initial application' },
        { status: 'enrolled', reason: 'Approved by admin' },
      ],
    });

    expect(enrollment.statusHistory).toHaveLength(2);
    expect(enrollment.statusHistory[0].status).toBe('applied');
    expect(enrollment.statusHistory[1].status).toBe('enrolled');
  });

  it('should have completionType for completed status', async () => {
    const enrollment = await ProgramEnrollment.create({
      learner: learnerId,
      program: programId,
      status: 'completed',
      completionType: 'with-certificate',
    });

    expect(enrollment.completionType).toBe('with-certificate');
  });
});

describe('DCV-027: CourseEnrollmentCurrent Model', () => {
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

    // Create Course
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
    });
    programEnrollmentId = enrollment._id;
  });

  it('should create a CourseEnrollmentCurrent with required fields', async () => {
    const current = await CourseEnrollmentCurrent.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
    });

    expect(current).toBeDefined();
    expect(current.learner.toString()).toBe(learnerId.toString());
    expect(current.course.toString()).toBe(courseId.toString());
    expect(current.programEnrollment.toString()).toBe(programEnrollmentId.toString());
    expect(current.enrolledAt).toBeDefined();
  });

  it('should have progress tracking for exams', async () => {
    const current = await CourseEnrollmentCurrent.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      progress: {
        examAttempts: [{
          examId: new mongoose.Types.ObjectId(),
          examType: 'quiz',
          attemptNumber: 1,
          points: 80,
          maxPoints: 100,
          percentage: 80,
          attemptedAt: new Date(),
          timeSpent: 1800,
        }],
      },
    });

    expect(current.progress.examAttempts).toHaveLength(1);
    expect(current.progress.examAttempts[0].points).toBe(80);
  });

  it('should have progress tracking for media', async () => {
    const current = await CourseEnrollmentCurrent.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      progress: {
        mediaProgress: [{
          mediaId: new mongoose.Types.ObjectId(),
          viewedMinutes: 30,
          requiredMinutes: 60,
          verified: false,
          lastViewedAt: new Date(),
        }],
      },
    });

    expect(current.progress.mediaProgress).toHaveLength(1);
    expect(current.progress.mediaProgress[0].viewedMinutes).toBe(30);
  });

  it('should have progress tracking for SCORM', async () => {
    const current = await CourseEnrollmentCurrent.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      progress: {
        scormAttempts: [{
          scormPackageId: new mongoose.Types.ObjectId(),
          attemptNumber: 1,
          score: 85,
          scaledScore: 0.85,
          completionStatus: 'completed',
          successStatus: 'passed',
          attemptedAt: new Date(),
          timeSpent: 3600,
        }],
      },
    });

    expect(current.progress.scormAttempts).toHaveLength(1);
    expect(current.progress.scormAttempts[0].score).toBe(85);
  });
});

describe('DCV-028: CourseEnrollmentActivity Model', () => {
  let userId: mongoose.Types.ObjectId;
  let learnerId: mongoose.Types.ObjectId;
  let departmentId: mongoose.Types.ObjectId;
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
  let programEnrollmentId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Same setup as Current...
    const user = await User.create({
      email: 'learner@test.com',
      passwordHash: 'hashedpassword123',
      roles: ['learner'],
      primaryRole: 'learner',
    });
    userId = user._id;

    const learner = new Learner({
      _id: userId,
      name: { first: 'Test', last: 'Learner' },
      email: 'learner@test.com',
    });
    await learner.save({ validateBeforeSave: false });
    learnerId = learner._id;

    const department = await Department.create({
      name: 'Test Department',
      code: 'TD',
      level: 'top',
    });
    departmentId = department._id;

    const program = await Program.create({
      name: 'Test Program',
      description: 'Test program description',
      department: departmentId,
      createdBy: userId,
    });
    programId = program._id;

    const programLevel = await ProgramLevel.create({
      name: 'Level 1',
      order: 1,
      program: programId,
      createdBy: userId,
    });
    programLevelId = programLevel._id;

    const course = await Course.create({
      title: 'Test Course',
      program: programId,
      programLevel: programLevelId,
      createdBy: userId,
    });
    courseId = course._id;

    const enrollment = await ProgramEnrollment.create({
      learner: learnerId,
      program: programId,
    });
    programEnrollmentId = enrollment._id;
  });

  it('should create a CourseEnrollmentActivity with required fields', async () => {
    const activity = await CourseEnrollmentActivity.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      outcome: 'passed',
    });

    expect(activity).toBeDefined();
    expect(activity.outcome).toBe('passed');
  });

  it('should support outcome values: passed, failed, withdrawn', async () => {
    const outcomes = ['passed', 'failed', 'withdrawn'];
    
    for (const outcome of outcomes) {
      await mongoose.connection.collections.courseenrollmentactivities?.deleteMany({});
      const activity = await CourseEnrollmentActivity.create({
        learner: learnerId,
        course: courseId,
        programEnrollment: programEnrollmentId,
        outcome,
      });
      expect(activity.outcome).toBe(outcome);
    }
  });

  it('should have finalScoring with scoring breakdown', async () => {
    const activity = await CourseEnrollmentActivity.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      outcome: 'passed',
      finalScoring: {
        totalPoints: 270,
        maxPoints: 300,
        percentage: 90,
        exams: {
          points: 180,
          maxPoints: 200,
          percentage: 90,
        },
        media: {
          points: 50,
          maxPoints: 50,
          percentage: 100,
        },
        scorm: {
          points: 40,
          maxPoints: 50,
          scaledScore: 0.8,
        },
      },
    });

    expect(activity.finalScoring.totalPoints).toBe(270);
    expect(activity.finalScoring.percentage).toBe(90);
    expect(activity.finalScoring.exams.points).toBe(180);
  });

  it('should preserve attemptHistory from Current', async () => {
    const activity = await CourseEnrollmentActivity.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      outcome: 'passed',
      attemptHistory: {
        examAttempts: [
          { examId: new mongoose.Types.ObjectId(), attemptNumber: 1, points: 70, maxPoints: 100 },
          { examId: new mongoose.Types.ObjectId(), attemptNumber: 2, points: 85, maxPoints: 100 },
        ],
      },
    });

    expect(activity.attemptHistory.examAttempts).toHaveLength(2);
  });

  it('should have visibleToLearner flag', async () => {
    const activity = await CourseEnrollmentActivity.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      outcome: 'failed',
      visibleToLearner: false,
    });

    expect(activity.visibleToLearner).toBe(false);
  });

  it('should track creditsEarned for passed courses', async () => {
    const activity = await CourseEnrollmentActivity.create({
      learner: learnerId,
      course: courseId,
      programEnrollment: programEnrollmentId,
      outcome: 'passed',
      creditsEarned: 3,
    });

    expect(activity.creditsEarned).toBe(3);
  });
});

describe('DCV-029: Learner.programEnrolmentStatuses removed', () => {
  it('should NOT have programEnrolmentStatuses field in Learner schema', async () => {
    const schema = Learner.schema;
    expect(schema.path('programEnrolmentStatuses')).toBeUndefined();
  });
});
