import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import AcademicYear from '../../../model/Academic/AcademicYear';
import AcademicTerm from '../../../model/Academic/AcademicTerm';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import Staff from '../../../model/Staff/Staff';
import Exam from '../../../model/Academic/Exam';

const adminToken = 'test-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Program levels, courses, and course content', () => {
  let programId: mongoose.Types.ObjectId;
  let programLevelId: string;
  let courseId: string;
  let examId: string;

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
      AcademicYear.deleteMany({}),
      AcademicTerm.deleteMany({}),
      ProgramLevel.deleteMany({}),
      Course.deleteMany({}),
      Staff.deleteMany({}),
      Exam.deleteMany({}),
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

    const programLevelRes = await request(app)
      .post('/api/v1/program-levels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        program: programId.toString(),
        name: 'Level 1',
        description: 'First level',
        order: 1,
        department: masterDepartmentId.toString(),
      });

    if (programLevelRes.status !== 201) {
      throw new Error('Failed to create program level for setup');
    }
    programLevelId = programLevelRes.body.data._id;

    const academicYear = await AcademicYear.create({
      name: '2024-2025',
      fromYear: new Date('2024-01-01'),
      toYear: new Date('2025-01-01'),
      createdBy: masterAdminId,
    });

    const academicTerm = await AcademicTerm.create({
      name: '1st Term',
      description: 'First term',
      duration: '3 months',
      createdBy: masterAdminId,
    });

    const programLevel = await ProgramLevel.create({
      program: programId,
      name: 'Level 1',
      description: 'Level 1',
      order: 1,
      createdBy: masterAdminId,
      department: masterDepartmentId,
    });

    const course = await Course.create({
      title: 'Alpha Course',
      description: 'Alpha course',
      program: programId,
      programLevel: programLevel._id,
      department: masterDepartmentId,
      createdBy: masterAdminId,
    });

    const instructor = await Staff.create({
      name: { first: 'Staff', last: 'User' },
      email: 'staff@example.com',
      password: 'password123',
      role: 'staff',
      isSuspended: false,
      isWithdrawn: false,
    });

    const exam = await Exam.create({
      name: 'Alpha Quiz',
      description: 'Quiz for Alpha',
      course: course._id,
      program: programId,
      passMark: 30,
      totalMark: 100,
      academicTerm: academicTerm._id,
      duration: '30 minutes',
      examDate: new Date(),
      examTime: '10:00',
      examType: 'quiz',
      examStatus: 'pending',
      programLevel: programLevel._id,
      createdBy: instructor._id,
      academicYear: academicYear._id,
    });
    examId = exam._id.toString();
  });

  it('creates and lists program levels', async () => {
    const listRes = await request(app)
      .get(`/api/v1/program-levels?program=${programId.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });

  it('creates courses and course content', async () => {
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Course 1',
        description: 'Course description',
        program: programId.toString(),
        programLevel: programLevelId,
        department: masterDepartmentId.toString(),
      });

    expect(courseRes.status).toBe(201);
    courseId = courseRes.body.data._id;

    const contentRes = await request(app)
      .post('/api/v1/course-contents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        course: courseId,
        contentType: 'custom',
        customContentId: examId,
        order: 1,
      });

    expect(contentRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/course-contents?course=${courseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });
});
