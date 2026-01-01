import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Admin from '../../../model/Staff/Admin';
import Teacher from '../../../model/Staff/Staff';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import AcademicYear from '../../../model/Academic/AcademicYear';
import AcademicTerm from '../../../model/Academic/AcademicTerm';
import Program from '../../../model/Academic/Program';
import Subject from '../../../model/Academic/Subject';
import ClassLevel from '../../../model/Academic/ClassLevel';
import Exam from '../../../model/Academic/Exam';

const masterToken = 'test-admin-token';
const topAdminToken = 'test-top-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const topAdminId = new mongoose.Types.ObjectId('0000000000000000000000a2');
const subAdminId = new mongoose.Types.ObjectId('0000000000000000000000a3');

const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);
const topDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d1');
const subDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d2');
const otherDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d3');

describe('Department Resources API', () => {
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
      Admin.deleteMany({}),
      Teacher.deleteMany({}),
      ScormPackage.deleteMany({}),
      AcademicYear.deleteMany({}),
      AcademicTerm.deleteMany({}),
      Program.deleteMany({}),
      Subject.deleteMany({}),
      ClassLevel.deleteMany({}),
      Exam.deleteMany({}),
    ]);

    await Department.create([
      {
        _id: masterDepartmentId,
        name: 'Master Department',
        code: 'MASTER',
        level: 'master',
      },
      {
        _id: topDepartmentId,
        name: 'Top Alpha',
        code: 'ALPHA',
        level: 'top',
        parent: null,
        ancestors: [],
      },
      {
        _id: subDepartmentId,
        name: 'Sub Alpha',
        code: 'ALPHA-S',
        level: 'sub',
        parent: topDepartmentId,
        ancestors: [topDepartmentId],
      },
      {
        _id: otherDepartmentId,
        name: 'Top Beta',
        code: 'BETA',
        level: 'top',
        parent: null,
        ancestors: [],
      },
    ]);

    await Admin.create([
      {
        _id: masterAdminId,
        name: 'Master Admin',
        email: 'master@example.com',
        password: 'Password@123',
        department: masterDepartmentId,
      },
      {
        _id: topAdminId,
        name: 'Top Admin',
        email: 'top@example.com',
        password: 'Password@123',
        department: topDepartmentId,
      },
      {
        _id: subAdminId,
        name: 'Sub Admin',
        email: 'sub@example.com',
        password: 'Password@123',
        department: subDepartmentId,
      },
    ]);

    await Teacher.create([
      {
        name: 'Alpha Teacher',
        email: 'alpha.teacher@example.com',
        password: 'Password@123',
        department: topDepartmentId,
      },
      {
        name: 'Sub Teacher',
        email: 'sub.teacher@example.com',
        password: 'Password@123',
        department: subDepartmentId,
      },
      {
        name: 'Beta Teacher',
        email: 'beta.teacher@example.com',
        password: 'Password@123',
        department: otherDepartmentId,
      },
    ]);

    await ScormPackage.create([
      {
        packageId: 'pkg-alpha',
        title: 'Alpha Package',
        description: 'Alpha package',
        version: 'scorm_1.2',
        fileName: 'alpha.zip',
        fileSize: 1234,
        filePath: '/tmp/alpha.zip',
        manifestData: {
          identifier: 'alpha-manifest',
          version: 'scorm_1.2',
          organizations: [],
        },
        launchUrl: '/launch/alpha',
        entryPoint: 'index.html',
        createdBy: masterAdminId,
        department: topDepartmentId,
        maxScore: 100,
        isGraded: true,
      },
      {
        packageId: 'pkg-beta',
        title: 'Beta Package',
        description: 'Beta package',
        version: 'scorm_1.2',
        fileName: 'beta.zip',
        fileSize: 2345,
        filePath: '/tmp/beta.zip',
        manifestData: {
          identifier: 'beta-manifest',
          version: 'scorm_1.2',
          organizations: [],
        },
        launchUrl: '/launch/beta',
        entryPoint: 'index.html',
        createdBy: masterAdminId,
        department: otherDepartmentId,
        maxScore: 100,
        isGraded: true,
      },
    ]);

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

    const program = await Program.create({
      name: 'Alpha Program',
      description: 'Program for Alpha dept',
      duration: '4 years',
      createdBy: masterAdminId,
      department: topDepartmentId,
    });

    const classLevel = await ClassLevel.create({
      name: 'Grade 1',
      description: 'Grade 1',
      createdBy: masterAdminId,
      department: topDepartmentId,
    });

    const subject = await Subject.create({
      name: 'Alpha Subject',
      description: 'Alpha subject',
      academicYear: academicYear._id,
      createdBy: masterAdminId,
      duration: '3 months',
      department: topDepartmentId,
      program: program._id,
    });

    const teacher = await Teacher.findOne({ email: 'alpha.teacher@example.com' }).lean();
    if (!teacher) {
      throw new Error('Teacher not found for exam setup');
    }

    await Exam.create({
      name: 'Alpha Quiz',
      description: 'Quiz for Alpha',
      subject: subject._id,
      program: program._id,
      passMark: 30,
      totalMark: 100,
      academicTerm: academicTerm._id,
      duration: '30 minutes',
      examDate: new Date(),
      examTime: '10:00',
      examType: 'quiz',
      examStatus: 'pending',
      classLevel: classLevel._id,
      createdBy: teacher._id,
      academicYear: academicYear._id,
    });
  });

  it('lists staff users within the scoped department hierarchy', async () => {
    const res = await request(app)
      .get('/api/v1/department-resources/staffusers')
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    const names = res.body.items.map((item: any) => item.name);
    expect(names).toContain('Top Admin');
    expect(names).toContain('Sub Admin');
    expect(names).toContain('Alpha Teacher');
    expect(names).toContain('Sub Teacher');
    expect(names).not.toContain('Beta Teacher');
  });

  it('filters staff users by role type', async () => {
    const res = await request(app)
      .get('/api/v1/department-resources/staffusers?type=teacher')
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    const roles = res.body.items.map((item: any) => item.role);
    expect(roles.every((role: string) => role === 'teacher')).toBe(true);
  });

  it('lists department content scoped to the department hierarchy', async () => {
    const res = await request(app)
      .get('/api/v1/department-resources/content?type=scorm')
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    const titles = res.body.items.map((item: any) => item.title);
    expect(titles).toContain('Alpha Package');
    expect(titles).not.toContain('Beta Package');
  });

  it('returns quiz content from exams', async () => {
    const res = await request(app)
      .get('/api/v1/department-resources/content?type=custom&customType=quiz')
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    const titles = res.body.items.map((item: any) => item.title);
    expect(titles).toContain('Alpha Quiz');
  });

  it('returns department hierarchy as a tree', async () => {
    const res = await request(app)
      .get('/api/v1/department-resources/departments')
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe(topDepartmentId.toString());
    expect(res.body.items[0].children[0].id).toBe(subDepartmentId.toString());
  });

  it('allows system admins to filter by departmentId', async () => {
    const res = await request(app)
      .get(`/api/v1/department-resources/staffusers?departmentId=${otherDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(res.status).toBe(200);
    const names = res.body.items.map((item: any) => item.name);
    expect(names).toContain('Beta Teacher');
    expect(names).not.toContain('Alpha Teacher');
  });
});
