import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import ScormAttempt from '../../../model/Scorm/ScormAttempt';
import Teacher from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';
import ClassLevel from '../../../model/Academic/ClassLevel';

const teacherId = '0000000000000000000000b1';
const adminId = '0000000000000000000000a1';
const teacherToken = 'test-teacher-token';

const makePackage = (overrides: Partial<any> = {}) => {
  const uploader = overrides.uploadedBy || new mongoose.Types.ObjectId(teacherId);
  return {
    packageId: new mongoose.Types.ObjectId().toString(),
    title: overrides.title || 'Teacher Package',
    description: 'Test package',
    version: 'scorm_1.2',
    fileName: 'test.zip',
    fileSize: 1000,
    filePath: 'test.zip',
    entryPoint: 'index.html',
    launchUrl: 'index.html',
    manifestData: {
      identifier: 'pkg-1',
      version: 'scorm_1.2',
      organizations: [],
      resources: [],
    },
    createdBy: uploader,
    uploadedBy: uploader,
    uploadedByModel: overrides.uploadedByModel || 'Teacher',
    isPublished: overrides.isPublished ?? false,
    status: overrides.status || 'draft',
  };
};

describe('Teacher Phase 2: Packages & Assignments', () => {
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
    await ScormPackage.deleteMany({});
    await ScormAttempt.deleteMany({});
    await ClassLevel.deleteMany({});
    await Teacher.deleteMany({ _id: teacherId });
    await Admin.deleteMany({ _id: adminId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ScormPackage.deleteMany({});
    await ScormAttempt.deleteMany({});
    await ClassLevel.deleteMany({});
  });

  it('lists only teacher-owned packages with attempt stats and supports status filtering', async () => {
    const pkgPublished = await ScormPackage.create(
      makePackage({ title: 'Published', isPublished: true, status: 'published' })
    );
    await ScormPackage.create(makePackage({ title: 'Draft', status: 'draft' }));

    await ScormPackage.create(
      makePackage({
        title: 'Other teacher',
        uploadedBy: new mongoose.Types.ObjectId('0000000000000000000000ff'),
        uploadedByModel: 'Teacher',
      })
    );

    await ScormAttempt.create([
      {
        attemptId: 'att-1',
        student: new mongoose.Types.ObjectId(),
        package: pkgPublished._id,
        attemptNumber: 1,
        status: 'completed',
      },
      {
        attemptId: 'att-2',
        student: new mongoose.Types.ObjectId(),
        package: pkgPublished._id,
        attemptNumber: 1,
        status: 'passed',
      },
    ] as any);

    const listRes = await request(app)
      .get('/api/v1/teachers/packages?limit=5')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    const { items, total } = listRes.body.data;
    expect(total).toBe(2);
    const published = items.find((i: any) => i.title === 'Published');
    expect(published.attemptsCount).toBe(2);
    expect(published.progressPct).toBe(100);

    const filterRes = await request(app)
      .get('/api/v1/teachers/packages?status=draft')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.data.items.length).toBe(1);
    expect(filterRes.body.data.items[0].status).toBe('draft');
  });

  it('creates assignments for teacher-owned classes and packages', async () => {
    const klass = await ClassLevel.create({
      name: 'Class 1',
      description: 'Test class',
      createdBy: new mongoose.Types.ObjectId(adminId),
      teachers: [new mongoose.Types.ObjectId(teacherId)],
    });

    const pkg = await ScormPackage.create(makePackage({ title: 'Assignable' }));

    const dueDate = new Date().toISOString();
    const res = await request(app)
      .post('/api/v1/teachers/assignments/assign')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ packageId: pkg._id.toString(), classIds: [klass._id.toString()], dueDate });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.assignmentId).toBe(pkg._id.toString());

    const updated = await ScormPackage.findById(pkg._id);
    expect(updated?.assignedTo?.classLevels?.map(String)).toContain(klass._id.toString());
    expect(updated?.dueDate).toBeDefined();
  });

  it('validates assignment input and ownership', async () => {
    const klass = await ClassLevel.create({
      name: 'Other class',
      description: 'Test class',
      createdBy: new mongoose.Types.ObjectId(adminId),
      teachers: [new mongoose.Types.ObjectId(adminId)],
    });

    const pkg = await ScormPackage.create(
      makePackage({
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        uploadedByModel: 'Admin',
      })
    );

    const missing = await request(app)
      .post('/api/v1/teachers/assignments/assign')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ classIds: [] });
    expect(missing.status).toBe(400);

    const unauthorizedClass = await request(app)
      .post('/api/v1/teachers/assignments/assign')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ packageId: pkg._id.toString(), classIds: [klass._id.toString()] });
    expect(unauthorizedClass.status).toBe(404);

    const ownedClass = await ClassLevel.create({
      name: 'Owned class',
      description: 'Owned',
      createdBy: new mongoose.Types.ObjectId(adminId),
      teachers: [new mongoose.Types.ObjectId(teacherId)],
    });

    const unauthorizedPackage = await request(app)
      .post('/api/v1/teachers/assignments/assign')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ packageId: pkg._id.toString(), classIds: [ownedClass._id.toString()] });
    expect(unauthorizedPackage.status).toBe(404);
  });
});
