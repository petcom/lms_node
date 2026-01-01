import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';

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
    uploadedByModel: overrides.uploadedByModel || 'Staff',
    isPublished: overrides.isPublished ?? false,
    status: overrides.status || 'draft',
  };
};

describe('Teacher Phase 1: Publish/Unpublish', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }

    await Staff.deleteMany({ _id: teacherId });
    await Admin.deleteMany({ _id: adminId });

    await Staff.create({
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
    await Staff.deleteMany({ _id: teacherId });
    await Admin.deleteMany({ _id: adminId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ScormPackage.deleteMany({});
  });

  it('publishes a draft package owned by the teacher', async () => {
    const pkg = await ScormPackage.create(makePackage());

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg._id.toString()}/publish`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(true);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.publishedBy).toBe(teacherId);
  });

  it('is idempotent when publishing an already published package', async () => {
    const pkg = await ScormPackage.create(makePackage({ isPublished: true, status: 'published' }));

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg.packageId}/publish`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(true);
    expect(res.body.data.status).toBe('published');
  });

  it('rejects publishing when teacher does not own the package', async () => {
    const pkg = await ScormPackage.create(
      makePackage({
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        uploadedByModel: 'Admin',
      })
    );

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg._id.toString()}/publish`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(404);
  });

  it('unpublishes a published package owned by the teacher', async () => {
    const pkg = await ScormPackage.create(makePackage({ isPublished: true, status: 'published' }));

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg._id.toString()}/unpublish`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(false);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.unpublishedBy).toBe(teacherId);
  });

  it('is idempotent when unpublishing an already draft package', async () => {
    const pkg = await ScormPackage.create(makePackage({ isPublished: false, status: 'draft' }));

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg.packageId}/unpublish`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(false);
    expect(res.body.data.status).toBe('draft');
  });
});
