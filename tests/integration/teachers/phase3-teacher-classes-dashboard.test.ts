import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ClassLevel from '../../../model/Academic/ClassLevel';
import Student from '../../../model/Academic/Student';
import ScormAttempt from '../../../model/Scorm/ScormAttempt';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Teacher from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';

const teacherId = '0000000000000000000000b1';
const adminId = '0000000000000000000000a1';
const teacherToken = 'test-teacher-token';

const makePackage = (title: string, uploader?: string) => ({
  packageId: new mongoose.Types.ObjectId().toString(),
  title,
  description: `${title} desc`,
  version: 'scorm_1.2',
  fileName: `${title}.zip`,
  fileSize: 1000,
  filePath: `${title}.zip`,
  entryPoint: 'index.html',
  launchUrl: 'index.html',
  manifestData: {
    identifier: title,
    version: 'scorm_1.2',
    organizations: [],
    resources: [],
  },
  createdBy: new mongoose.Types.ObjectId(uploader || teacherId),
  uploadedBy: new mongoose.Types.ObjectId(uploader || teacherId),
  uploadedByModel: 'Teacher' as const,
  isPublished: true,
  status: 'published',
});

describe('Teacher Phase 3: Classes & Dashboard', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }

    await Teacher.deleteMany({ _id: teacherId });
    await Admin.deleteMany({ _id: adminId });

    await Teacher.create({
      _id: new mongoose.Types.ObjectId(teacherId),
      name: 'Teacher One',
      email: 'teacher1@example.com',
      password: 'password',
      role: 'teacher',
    });

    await Admin.create({
      _id: new mongoose.Types.ObjectId(adminId),
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password',
      role: 'admin',
    });
  });

  afterAll(async () => {
    await ClassLevel.deleteMany({});
    await Student.deleteMany({});
    await ScormAttempt.deleteMany({});
    await ScormPackage.deleteMany({});
    await Teacher.deleteMany({ _id: teacherId });
    await Admin.deleteMany({ _id: adminId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ClassLevel.deleteMany({});
    await Student.deleteMany({});
    await ScormAttempt.deleteMany({});
    await ScormPackage.deleteMany({});
  });

  it('returns classes with student counts and completion/pass rates, plus dashboard aggregates', async () => {
    const klass = await ClassLevel.create({
      name: 'Class 1',
      description: 'Test class',
      createdBy: new mongoose.Types.ObjectId(adminId),
      teachers: [new mongoose.Types.ObjectId(teacherId)],
    });

    const pkg = await ScormPackage.create(makePackage('Pkg1'));

    const student1 = await Student.create({
      name: 'Student One',
      email: 's1@example.com',
      password: 'pw',
      classLevels: [klass._id.toString()],
      role: 'student',
    });
    const student2 = await Student.create({
      name: 'Student Two',
      email: 's2@example.com',
      password: 'pw',
      classLevels: [klass._id.toString()],
      role: 'student',
    });

    await ScormAttempt.create([
      {
        attemptId: 'att-1',
        student: student1._id,
        package: pkg._id,
        attemptNumber: 1,
        status: 'completed',
      },
      {
        attemptId: 'att-2',
        student: student1._id,
        package: pkg._id,
        attemptNumber: 2,
        status: 'passed',
      },
      {
        attemptId: 'att-3',
        student: student2._id,
        package: pkg._id,
        attemptNumber: 1,
        status: 'failed',
      },
    ] as any);

    const classRes = await request(app)
      .get('/api/v1/teachers/classes')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(classRes.status).toBe(200);
    const { items } = classRes.body.data;
    expect(items[0].students).toBe(2);
    expect(items[0].completion).toBeGreaterThan(0);

    const dashboardRes = await request(app)
      .get('/api/v1/teachers/dashboard')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.data.classes).toBe(1);
    expect(dashboardRes.body.data.students).toBe(2);
    expect(dashboardRes.body.data.activePackages).toBe(1);
  });
});
