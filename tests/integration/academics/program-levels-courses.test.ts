import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import Staff from '../../../model/Staff/Staff';
import CustomContent from '../../../model/Content/CustomContent';
import User from '../../../model/Auth/User';
import { hashPassword } from '../../../utils/helpers';

const adminToken = 'test-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Program levels, courses, and course content', () => {
  let programId: mongoose.Types.ObjectId;
  let programLevelId: string;
  let courseId: string;
  let customContentId: string;

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
      CustomContent.deleteMany({}),
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

    const programLevelObjectId = new mongoose.Types.ObjectId(programLevelId);
    const course = await Course.create({
      title: 'Alpha Course',
      description: 'Alpha course',
      program: programId,
      programLevel: programLevelObjectId,
      department: masterDepartmentId,
      createdBy: masterAdminId,
    });

    const instructor = await Staff.create({
      name: { first: 'Staff', last: 'User' },
      email: 'staff@example.com',
    });
    await User.create({
      _id: instructor._id,
      email: 'staff@example.com',
      passwordHash: await hashPassword('Password123!'),
      role: 'staff',
      status: 'active',
    });

    const customContent = await CustomContent.create({
      title: 'Alpha Quiz',
      customType: 'quiz',
      department: masterDepartmentId,
      createdBy: instructor._id,
    });
    customContentId = customContent._id.toString();
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
        customContentId: customContentId,
        order: 1,
      });

    expect(contentRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/api/v1/course-contents?course=${courseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });

  it('updates program level courses and syncs course programLevel', async () => {
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Course 2',
        description: 'Course description',
        program: programId.toString(),
        department: masterDepartmentId.toString(),
      });

    expect(courseRes.status).toBe(201);
    const newCourseId = courseRes.body.data._id;

    const updateRes = await request(app)
      .put(`/api/v1/program-levels/${programLevelId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courses: [newCourseId],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.courses).toContain(newCourseId);

    const updatedCourse = await Course.findById(newCourseId).lean();
    expect(updatedCourse?.programLevel?.toString()).toBe(programLevelId);
  });

  it('publishes and unpublishes a course', async () => {
    const courseRes = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Course 3',
        description: 'Course description',
        program: programId.toString(),
        programLevel: programLevelId,
        department: masterDepartmentId.toString(),
      });

    expect(courseRes.status).toBe(201);
    const targetCourseId = courseRes.body.data._id;

    const publishRes = await request(app)
      .patch(`/api/v1/courses/${targetCourseId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.status).toBe('published');

    const unpublishRes = await request(app)
      .patch(`/api/v1/courses/${targetCourseId}/unpublish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(unpublishRes.status).toBe(200);
    expect(unpublishRes.body.data.status).toBe('rendered');
  });
});
