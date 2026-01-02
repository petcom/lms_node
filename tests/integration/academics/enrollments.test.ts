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
import CourseEnrollment from '../../../model/Academic/CourseEnrollment';

const adminToken = 'test-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Enrollment APIs', () => {
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let classId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
  let learnerId: mongoose.Types.ObjectId;

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
      ProgramEnrollment.deleteMany({}),
      ClassEnrollment.deleteMany({}),
      CourseEnrollment.deleteMany({}),
    ]);

    await Department.create({
      _id: masterDepartmentId,
      name: 'Master Department',
      level: 'master',
      code: 'MASTER',
    });

    const program = await Program.create({
      name: 'Program Alpha',
      description: 'Alpha desc',
      duration: '4 years',
      createdBy: masterAdminId,
      department: masterDepartmentId,
    });
    programId = program._id;

    const programLevel = await ProgramLevel.create({
      program: programId,
      name: 'Level 1',
      description: 'First level',
      order: 1,
      department: masterDepartmentId,
      createdBy: masterAdminId,
    });
    programLevelId = programLevel._id;

    const classDoc = await ClassModel.create({
      name: 'Cohort A',
      program: programId,
      programLevel: programLevelId,
      department: masterDepartmentId,
      createdBy: masterAdminId,
    });
    classId = classDoc._id;

    const course = await Course.create({
      title: 'Course 1',
      description: 'Course description',
      program: programId,
      programLevel: programLevelId,
      department: masterDepartmentId,
      createdBy: masterAdminId,
    });
    courseId = course._id;

    const learner = await Learner.create({
      name: { first: 'Learner', last: 'One' },
      email: 'learner1@example.com',
      password: 'password123',
      role: 'learner',
      globalStatus: 'active',
      isSuspended: false,
      isWithdrawn: false,
    });
    learnerId = learner._id;
  });

  it('creates and lists program enrollments', async () => {
    const createRes = await request(app)
      .post('/api/v1/program-enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        learner: learnerId.toString(),
        program: programId.toString(),
      });

    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/program-enrollments?learner=${learnerId.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });

  it('creates and updates class enrollments', async () => {
    const createRes = await request(app)
      .post('/api/v1/class-enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        learner: learnerId.toString(),
        classId: classId.toString(),
      });

    expect(createRes.status).toBe(201);

    const updateRes = await request(app)
      .put(`/api/v1/class-enrollments/${createRes.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ completedAt: new Date().toISOString() });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.completedAt).toBeTruthy();
  });

  it('creates and lists course enrollments', async () => {
    const createRes = await request(app)
      .post('/api/v1/course-enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        learner: learnerId.toString(),
        course: courseId.toString(),
        classId: classId.toString(),
        progress: 25,
      });

    expect(createRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/course-enrollments?course=${courseId.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });

  it('completes course enrollment and updates program enrollment status', async () => {
    const programEnrollmentRes = await request(app)
      .post('/api/v1/program-enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        learner: learnerId.toString(),
        program: programId.toString(),
      });

    expect(programEnrollmentRes.status).toBe(201);

    const courseRes = await request(app)
      .post('/api/v1/course-enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        learner: learnerId.toString(),
        course: courseId.toString(),
        classId: classId.toString(),
        progress: 0,
      });

    expect(courseRes.status).toBe(201);

    const updateRes = await request(app)
      .put(`/api/v1/course-enrollments/${courseRes.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed', progress: 100 });

    expect(updateRes.status).toBe(200);

    const updatedProgram = await ProgramEnrollment.findOne({
      learner: learnerId,
      program: programId,
    }).lean();

    expect(updatedProgram?.status).toBe('completed');

    const reportRes = await request(app)
      .get(`/api/v1/content/reports/learner/${learnerId.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.data.programEnrollments.length).toBeGreaterThan(0);
    expect(reportRes.body.data.courseEnrollments.length).toBeGreaterThan(0);
  });
});
