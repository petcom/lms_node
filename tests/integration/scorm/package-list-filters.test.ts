import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Department from '../../../model/Academic/Department';

const teacherToken = 'test-teacher-token';
const teacherId = new mongoose.Types.ObjectId('0000000000000000000000b1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

const basePackage = (overrides: Partial<any> = {}) => ({
  packageId: new mongoose.Types.ObjectId().toString(),
  title: 'Default Package',
  description: 'Desc',
  version: 'scorm_1.2',
  fileName: 'pkg.zip',
  fileSize: 100,
  filePath: 'pkg',
  manifestData: {
    identifier: 'MANIFEST',
    version: 'scorm_1.2',
    organizations: [],
    resources: [],
  },
  launchUrl: 'index.html',
  entryPoint: 'index.html',
  createdBy: teacherId,
  uploadedBy: teacherId,
  uploadedByModel: 'Teacher',
  status: 'draft',
  isPublished: false,
  department: masterDepartmentId,
  ...overrides,
});

describe('SCORM packages listing filters', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }

    await Department.deleteMany({});
    await Department.create({
      _id: masterDepartmentId,
      name: 'Master Department',
      code: 'MASTER',
      level: 'master',
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ScormPackage.deleteMany({});
  });

  it('filters by status and returns pagination metadata', async () => {
    await ScormPackage.create([
      basePackage({ title: 'Alpha Draft', status: 'draft', isPublished: false }),
      basePackage({ title: 'Bravo Published', status: 'published', isPublished: true }),
    ]);

    const resDraft = await request(app)
      .get('/api/v1/scorm/packages?status=draft&page=1&limit=10')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(resDraft.status).toBe(200);
    expect(resDraft.body.data.length).toBe(1);
    expect(resDraft.body.data[0].title).toBe('Alpha Draft');
    expect(resDraft.body.pagination.total).toBe(1);
    expect(resDraft.body.pagination.page).toBe(1);
    expect(resDraft.body.pagination.limit).toBe(10);

    const resPublished = await request(app)
      .get('/api/v1/scorm/packages?status=published&page=1&limit=10')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(resPublished.status).toBe(200);
    expect(resPublished.body.data.length).toBe(1);
    expect(resPublished.body.data[0].title).toBe('Bravo Published');
  });

  it('filters by search across title', async () => {
    await ScormPackage.create([
      basePackage({ title: 'Alpha Course' }),
      basePackage({ title: 'Beta Course' }),
    ]);

    const res = await request(app)
      .get('/api/v1/scorm/packages?search=Alpha')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].title).toBe('Alpha Course');
  });
});
