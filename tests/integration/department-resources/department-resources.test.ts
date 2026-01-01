import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Admin from '../../../model/Staff/Admin';
import Staff from '../../../model/Staff/Staff';
import StaffRole from '../../../model/Staff/StaffRole';
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
      Staff.deleteMany({}),
      StaffRole.deleteMany({}),
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

    await Staff.create([
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

    const teacher = await Staff.findOne({ email: 'alpha.teacher@example.com' }).lean();
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
      .get('/api/v1/department-resources/staffusers?type=staff')
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    const roles = res.body.items.map((item: any) => item.role);
    expect(roles.every((role: string) => role === 'staff')).toBe(true);
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

  it('updates staff roles within scope', async () => {
    await StaffRole.create([
      { name: 'instructor' },
      { name: 'content-admin' },
      { name: 'department-admin' },
      { name: 'billing-admin' },
    ]);

    const staff = await Staff.findOne({ email: 'alpha.teacher@example.com' }).lean();
    if (!staff) {
      throw new Error('Staff member not found for role update');
    }

    const res = await request(app)
      .patch(`/api/v1/department-resources/staffusers/${staff._id.toString()}/role`)
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({ roles: ['instructor', 'content-admin'] });

    expect(res.status).toBe(200);
    expect(res.body.data.roles).toEqual(expect.arrayContaining(['instructor', 'content-admin']));
  });

  it('updates staff department within scope', async () => {
    const staff = await Staff.findOne({ email: 'alpha.teacher@example.com' }).lean();
    if (!staff) {
      throw new Error('Staff member not found for department update');
    }

    const res = await request(app)
      .patch(`/api/v1/department-resources/staffusers/${staff._id.toString()}/department`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ departmentId: otherDepartmentId.toString() });

    expect(res.status).toBe(200);
    expect(res.body.data.department).toBe(otherDepartmentId.toString());
  });

  it('creates and updates custom content', async () => {
    const subject = await Subject.findOne({ name: 'Alpha Subject' }).lean();
    const program = await Program.findOne({ name: 'Alpha Program' }).lean();
    const classLevel = await ClassLevel.findOne({ name: 'Grade 1' }).lean();
    const academicTerm = await AcademicTerm.findOne({ name: '1st Term' }).lean();
    const academicYear = await AcademicYear.findOne({ name: '2024-2025' }).lean();

    if (!subject || !program || !classLevel || !academicTerm || !academicYear) {
      throw new Error('Missing academic data for content setup');
    }

    const createRes = await request(app)
      .post('/api/v1/department-resources/content')
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({
        type: 'custom',
        title: 'Alpha Practice',
        description: 'Practice exam',
        customType: 'practice',
        subject: subject._id.toString(),
        program: program._id.toString(),
        classLevel: classLevel._id.toString(),
        academicTerm: academicTerm._id.toString(),
        academicYear: academicYear._id.toString(),
        passMark: 30,
        totalMark: 100,
        duration: '30 minutes',
        examDate: '2025-01-01T00:00:00Z',
        examTime: '09:00',
        examStatus: 'pending',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.customType).toBe('practice');

    const contentId = createRes.body.data.id;
    const updateRes = await request(app)
      .patch(`/api/v1/department-resources/content/${contentId}`)
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({ type: 'custom', title: 'Alpha Practice Updated', customType: 'quiz' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe('Alpha Practice Updated');
    expect(updateRes.body.data.examType).toBe('quiz');
  });

  it('creates and updates programs', async () => {
    const createRes = await request(app)
      .post('/api/v1/department-resources/programs')
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({
        name: 'Gamma Program',
        description: 'Gamma department program',
        duration: '2 years',
        departmentId: topDepartmentId.toString(),
      });

    expect(createRes.status).toBe(201);

    const existingProgram = await Program.findOne({ name: 'Alpha Program' }).lean();
    if (!existingProgram) {
      throw new Error('Alpha Program not found for update');
    }

    const updateRes = await request(app)
      .patch(`/api/v1/department-resources/programs/${existingProgram._id.toString()}`)
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({ description: 'Updated program description' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.description).toBe('Updated program description');

    const deptRes = await request(app)
      .patch(`/api/v1/department-resources/programs/${existingProgram._id.toString()}/department`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ departmentId: otherDepartmentId.toString() });

    expect(deptRes.status).toBe(200);
    expect(deptRes.body.data.department).toBe(otherDepartmentId.toString());
  });

  it('creates and updates courses', async () => {
    const academicYear = await AcademicYear.findOne({ name: '2024-2025' }).lean();
    const program = await Program.findOne({ name: 'Alpha Program' }).lean();

    if (!academicYear || !program) {
      throw new Error('Missing academic data for course setup');
    }

    const createRes = await request(app)
      .post('/api/v1/department-resources/courses')
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({
        name: 'Alpha Course',
        description: 'Course for Alpha',
        duration: '3 months',
        academicYear: academicYear._id.toString(),
        departmentId: topDepartmentId.toString(),
        programId: program._id.toString(),
      });

    expect(createRes.status).toBe(201);

    const course = await Subject.findOne({ name: 'Alpha Subject' }).lean();
    if (!course) {
      throw new Error('Alpha Subject not found for update');
    }

    const updateRes = await request(app)
      .patch(`/api/v1/department-resources/courses/${course._id.toString()}`)
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({ description: 'Updated course description' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.description).toBe('Updated course description');

    const programUpdateRes = await request(app)
      .patch(`/api/v1/department-resources/courses/${course._id.toString()}/program`)
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({ programId: program._id.toString() });

    expect(programUpdateRes.status).toBe(200);
    expect(programUpdateRes.body.data.program).toBe(program._id.toString());

    const deptRes = await request(app)
      .patch(`/api/v1/department-resources/courses/${course._id.toString()}/department`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ departmentId: otherDepartmentId.toString() });

    expect(deptRes.status).toBe(200);
    expect(deptRes.body.data.department).toBe(otherDepartmentId.toString());
  });

  it('updates department metadata', async () => {
    const res = await request(app)
      .patch(`/api/v1/department-resources/departments/${topDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ name: 'Top Alpha Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Top Alpha Updated');
  });
});
