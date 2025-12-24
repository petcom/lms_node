import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ClassLevel from '../../../model/Academic/ClassLevel';
import Student from '../../../model/Academic/Student';
import ScormAttempt from '../../../model/Scorm/ScormAttempt';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Teacher from '../../../model/Staff/Teacher';
import Admin from '../../../model/Staff/Admin';

const teacherId = '0000000000000000000000b1';
const adminId = '0000000000000000000000a1';
const teacherToken = 'test-teacher-token';

const makePackage = (title: string) => ({
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
  createdBy: new mongoose.Types.ObjectId(teacherId),
  uploadedBy: new mongoose.Types.ObjectId(teacherId),
  uploadedByModel: 'Teacher' as const,
  isPublished: true,
  status: 'published',
});

describe('Teacher Phase 4: Attempts Listing', () => {
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

  it('lists attempts filtered by classId and packageId, scoped to teacher classes', async () => {
    const klass = await ClassLevel.create({
      name: 'Class 1',
      description: 'Test class',
      createdBy: new mongoose.Types.ObjectId(adminId),
      teachers: [new mongoose.Types.ObjectId(teacherId)],
    });

    const pkg = await ScormPackage.create(makePackage('Pkg1'));

    const student = await Student.create({
      name: 'Student One',
      email: 's1@example.com',
      password: 'pw',
      classLevels: [klass._id.toString()],
      role: 'student',
    });

    await ScormAttempt.create({
      attemptId: 'att-1',
      student: student._id,
      package: pkg._id,
      attemptNumber: 1,
      status: 'completed',
      startedAt: new Date('2024-01-01T00:00:00Z'),
      completedAt: new Date('2024-01-01T01:00:00Z'),
    } as any);

    const res = await request(app)
      .get(`/api/v1/teachers/attempts?classId=${klass._id.toString()}&packageId=${pkg._id.toString()}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].studentName).toBe('Student One');
    expect(res.body.data.items[0].packageTitle).toBe('Pkg1');
    expect(res.body.data.items[0].status).toBe('completed');
  });
});
