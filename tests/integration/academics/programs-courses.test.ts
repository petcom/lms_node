import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import Staff from '../../../model/Staff/Staff';
import User from '../../../model/Auth/User';
import { hashPassword } from '../../../utils/helpers';

const adminToken = 'test-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Program courses endpoint', () => {
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
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
      name: 'Program Catalog',
      description: 'Program desc',
      duration: '4 years',
      createdBy: masterAdminId,
      department: masterDepartmentId,
    });
    programId = program._id;

    // Create User FIRST (required by personValidation middleware)
    const instructorIdLocal = new mongoose.Types.ObjectId();
    await User.create({
      _id: instructorIdLocal,
      email: 'ada@example.com',
      passwordHash: await hashPassword('Password123!'),
      roles: ['staff'],
      primaryRole: 'staff',
      status: 'active',
    });
    // THEN create Staff with same _id
    const instructor = await Staff.create({
      _id: instructorIdLocal,
      name: { first: 'Ada', last: 'Lovelace' },
      email: 'ada@example.com',
    });
    instructorId = instructor._id;

    const programLevel = await ProgramLevel.create({
      program: programId,
      name: 'Level 1',
      description: 'Level desc',
      order: 1,
      department: masterDepartmentId,
      createdBy: masterAdminId,
      courses: [],
    });
    programLevelId = programLevel._id;

    const courseDraft = await Course.create({
      title: 'Course Draft',
      description: 'Draft course',
      program: programId,
      programLevel: programLevelId,
      department: masterDepartmentId,
      createdBy: masterAdminId,
      primaryInstructors: [instructorId],
    });

    const courseRendered = await Course.create({
      title: 'Course Rendered',
      description: 'Rendered course',
      program: programId,
      programLevel: programLevelId,
      department: masterDepartmentId,
      createdBy: masterAdminId,
      status: 'rendered',
      secondaryInstructors: [instructorId],
    });

    await ProgramLevel.findByIdAndUpdate(programLevelId, {
      $set: { courses: [courseDraft._id, courseRendered._id] },
    });
  });

  it('lists derived program courses with instructor info', async () => {
    const res = await request(app)
      .get(`/api/v1/programs/${programId.toString()}/courses`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].programLevelId).toBe(programLevelId.toString());
    expect(res.body.data.some((item: any) => item.primaryInstructors.length > 0)).toBe(true);
  });

  it('filters program courses by status', async () => {
    const res = await request(app)
      .get(`/api/v1/programs/${programId.toString()}/courses?status=rendered`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].status).toBe('rendered');
  });

  it('filters program courses by instructor', async () => {
    const res = await request(app)
      .get(`/api/v1/programs/${programId.toString()}/courses?instructor=${instructorId.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });
});
