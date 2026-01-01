import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ClassLevel from '../../../model/Academic/ClassLevel';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Staff from '../../../model/Staff/Staff';
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
  uploadedByModel: 'Staff' as const,
  isPublished: true,
  status: 'published',
});

describe('Teacher Phase 5: Assignment Listing', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }

    await Staff.deleteMany({ _id: teacherId });
    await Admin.deleteMany({ _id: adminId });

    await Staff.create({
      _id: new mongoose.Types.ObjectId(teacherId),
      name: 'Staff One',
      email: 'teacher1@example.com',
      password: 'password',
      role: 'staff',
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
    await ScormPackage.deleteMany({});
    await Staff.deleteMany({ _id: teacherId });
    await Admin.deleteMany({ _id: adminId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ClassLevel.deleteMany({});
    await ScormPackage.deleteMany({});
  });

  it('lists assignments for teacher-owned classes and supports classId filter', async () => {
    const klass = await ClassLevel.create({
      name: 'Class 1',
      description: 'Test class',
      createdBy: new mongoose.Types.ObjectId(adminId),
      teachers: [new mongoose.Types.ObjectId(teacherId)],
    });

    const pkg = await ScormPackage.create(makePackage('Pkg1'));
    pkg.assignedTo = { ...pkg.assignedTo, classLevels: [klass._id] } as any;
    (pkg as any).dueDate = new Date('2024-01-01T00:00:00Z');
    await pkg.save();

    const res = await request(app)
      .get(`/api/v1/staff/assignments?classId=${klass._id.toString()}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].packageTitle).toBe('Pkg1');
    expect(res.body.data.items[0].classIds).toContain(klass._id.toString());
    expect(res.body.data.items[0].classNames).toContain('Class 1');
  });

  it('rejects listing for a class not owned by the teacher', async () => {
    const otherClass = await ClassLevel.create({
      name: 'Other Class',
      description: 'Not owned',
      createdBy: new mongoose.Types.ObjectId(adminId),
      teachers: [new mongoose.Types.ObjectId(adminId)],
    });

    const res = await request(app)
      .get(`/api/v1/staff/assignments?classId=${otherClass._id.toString()}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(404);
  });
});
