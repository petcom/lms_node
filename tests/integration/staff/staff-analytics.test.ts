import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import ProgramEnrollment from '../../../model/Academic/ProgramEnrollment';
import CourseEnrollment from '../../../model/Academic/CourseEnrollment';

const staffToken = 'test-instructor-token';
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Staff Analytics API', () => {
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
      ProgramEnrollment.deleteMany({}),
      CourseEnrollment.deleteMany({}),
    ]);

    await Department.create({
      _id: masterDepartmentId,
      name: 'Master Department',
      code: 'MASTER',
      level: 'master',
    });
  });

  it('returns program analytics with windowed completion and abandonment', async () => {
    const now = new Date();
    const weeks = 4;
    const windowStart = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    const withinWindow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const beforeWindow = new Date(windowStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const program = await Program.create({
      name: 'STEM Foundations',
      description: 'Program',
      duration: '4 years',
      createdBy: new mongoose.Types.ObjectId('0000000000000000000000a1'),
      department: masterDepartmentId,
    });

    const learners = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ];

    await ProgramEnrollment.create([
      {
        learner: learners[0],
        program: program._id,
        status: 'completed',
        enrolledAt: withinWindow,
        completedAt: withinWindow,
        createdAt: withinWindow,
        updatedAt: withinWindow,
      },
      {
        learner: learners[1],
        program: program._id,
        status: 'completed',
        enrolledAt: withinWindow,
        completedAt: withinWindow,
        createdAt: withinWindow,
        updatedAt: withinWindow,
      },
      {
        learner: learners[2],
        program: program._id,
        status: 'enrolled',
        enrolledAt: withinWindow,
        createdAt: withinWindow,
        updatedAt: withinWindow,
      },
      {
        learner: learners[3],
        program: program._id,
        status: 'withdrawn',
        enrolledAt: beforeWindow,
        withdrawnAt: beforeWindow,
        createdAt: beforeWindow,
        updatedAt: beforeWindow,
      },
    ]);

    await CourseEnrollment.create({
      learner: learners[2],
      program: program._id,
      course: new mongoose.Types.ObjectId(),
      status: 'active',
      startedAt: beforeWindow,
      createdAt: beforeWindow,
      updatedAt: beforeWindow,
    });

    const res = await request(app)
      .get(`/api/v1/staff/analytics/programs?weeks=${weeks}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const analytics = res.body.data[0];
    expect(analytics.programId).toBe(program._id.toString());
    expect(analytics.completionRate).toBeCloseTo(0.5);
    expect(analytics.abandonmentRate).toBeCloseTo(0.25);
    expect(analytics.activeLearners).toBe(1);
    expect(analytics.weeklyEnrollments).toHaveLength(weeks);
    const weeklyTotal = analytics.weeklyEnrollments.reduce((sum: number, value: number) => sum + value, 0);
    expect(weeklyTotal).toBe(3);
  });

  it('returns level analytics with deduped active learners', async () => {
    const now = new Date();
    const weeks = 4;
    const windowStart = new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    const withinWindow = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const beforeWindow = new Date(windowStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const program = await Program.create({
      name: 'Arts',
      description: 'Program',
      duration: '2 years',
      createdBy: new mongoose.Types.ObjectId('0000000000000000000000a1'),
      department: masterDepartmentId,
    });

    const level = await ProgramLevel.create({
      program: program._id,
      name: 'Level 1',
      order: 1,
      createdBy: new mongoose.Types.ObjectId('0000000000000000000000a1'),
    });

    const learnerA = new mongoose.Types.ObjectId();
    const learnerB = new mongoose.Types.ObjectId();

    await CourseEnrollment.create([
      {
        learner: learnerA,
        program: program._id,
        programLevel: level._id,
        course: new mongoose.Types.ObjectId(),
        status: 'completed',
        startedAt: withinWindow,
        completedAt: withinWindow,
        createdAt: withinWindow,
        updatedAt: withinWindow,
      },
      {
        learner: learnerB,
        program: program._id,
        programLevel: level._id,
        course: new mongoose.Types.ObjectId(),
        status: 'active',
        startedAt: beforeWindow,
        createdAt: beforeWindow,
        updatedAt: beforeWindow,
      },
      {
        learner: learnerB,
        program: program._id,
        programLevel: level._id,
        course: new mongoose.Types.ObjectId(),
        status: 'active',
        startedAt: beforeWindow,
        createdAt: beforeWindow,
        updatedAt: beforeWindow,
      },
    ]);

    const res = await request(app)
      .get(`/api/v1/staff/analytics/programs/${program._id.toString()}/levels?weeks=${weeks}`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const analytics = res.body.data[0];
    expect(analytics.levelId).toBe(level._id.toString());
    expect(analytics.completionRate).toBeCloseTo(1 / 3);
    expect(analytics.abandonmentRate).toBeCloseTo(1 / 3);
    expect(analytics.activeLearners).toBe(1);
    expect(analytics.weeklyEnrollments).toHaveLength(weeks);
  });
});
