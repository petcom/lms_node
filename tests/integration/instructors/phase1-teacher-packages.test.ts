import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';

const instructorId = '0000000000000000000000b1';
const adminId = '0000000000000000000000a1';
const instructorToken = 'test-instructor-token';

const makePackage = (overrides: Partial<any> = {}) => {
  const uploader = overrides.uploadedBy || new mongoose.Types.ObjectId(instructorId);
  return {
    packageId: new mongoose.Types.ObjectId().toString(),
    title: overrides.title || 'Instructor Package',
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

describe('Instructor Phase 1: Publish/Unpublish', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }

    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });

    await Staff.create({
      _id: new mongoose.Types.ObjectId(instructorId),
      name: 'Staff One',
      email: 'instructor1@example.com',
      password: 'password',
      role: 'staff',
    });

    await Admin.create({
      _id: new mongoose.Types.ObjectId(adminId),
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password',
      role: 'global-admin',
    });
  });

  afterAll(async () => {
    await ScormPackage.deleteMany({});
    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ScormPackage.deleteMany({});
  });

  it('publishes a draft package owned by the instructor', async () => {
    const pkg = await ScormPackage.create(makePackage());

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg._id.toString()}/publish`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(true);
    expect(res.body.data.status).toBe('published');
    expect(res.body.data.publishedBy).toBe(instructorId);
  });

  it('is idempotent when publishing an already published package', async () => {
    const pkg = await ScormPackage.create(makePackage({ isPublished: true, status: 'published' }));

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg.packageId}/publish`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(true);
    expect(res.body.data.status).toBe('published');
  });

  it('rejects publishing when instructor does not own the package', async () => {
    const pkg = await ScormPackage.create(
      makePackage({
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        uploadedByModel: 'Admin',
      })
    );

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg._id.toString()}/publish`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(404);
  });

  it('unpublishes a published package owned by the instructor', async () => {
    const pkg = await ScormPackage.create(makePackage({ isPublished: true, status: 'published' }));

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg._id.toString()}/unpublish`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(false);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.unpublishedBy).toBe(instructorId);
  });

  it('is idempotent when unpublishing an already draft package', async () => {
    const pkg = await ScormPackage.create(makePackage({ isPublished: false, status: 'draft' }));

    const res = await request(app)
      .post(`/api/v1/staff/packages/${pkg.packageId}/unpublish`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isPublished).toBe(false);
    expect(res.body.data.status).toBe('draft');
  });
});
