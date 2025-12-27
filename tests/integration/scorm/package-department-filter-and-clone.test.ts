import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Department from '../../../model/Academic/Department';

const masterToken = 'test-admin-token';
const topAdminToken = 'test-top-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);
const topDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d1');
const otherTopDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d3');

const basePackage = (overrides: Partial<any> = {}) => ({
  packageId: new mongoose.Types.ObjectId().toString(),
  title: overrides.title || 'Package',
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
  createdBy: masterAdminId,
  uploadedBy: masterAdminId,
  uploadedByModel: 'Admin',
  status: 'draft',
  isPublished: false,
  department: masterDepartmentId,
  ...overrides,
});

describe('SCORM packages department filter and cloning', () => {
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
    await ScormPackage.deleteMany({});
    await Department.deleteMany({});

    await Department.create({
      _id: masterDepartmentId,
      name: 'Master',
      level: 'master',
      code: 'MASTER',
    });
    await Department.create({
      _id: topDepartmentId,
      name: 'Top Alpha',
      level: 'top',
      code: 'ALPHA',
    });
    await Department.create({
      _id: otherTopDepartmentId,
      name: 'Top Beta',
      level: 'top',
      code: 'BETA',
    });

    await ScormPackage.create([
      basePackage({ title: 'Alpha Dept', department: topDepartmentId }),
      basePackage({ title: 'Beta Dept', department: otherTopDepartmentId }),
      basePackage({ title: 'Global Pkg', isGlobal: true, department: masterDepartmentId }),
    ]);
  });

  it('allows master admin to filter packages by department', async () => {
    const res = await request(app)
      .get(`/api/v1/scorm/packages?department=${otherTopDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(res.status).toBe(200);
    const titles = res.body.data.map((p: any) => p.title);
    expect(titles).toContain('Beta Dept');
    expect(titles).not.toContain('Alpha Dept');
  });

  it('ignores out-of-scope department filters for non-master admins but still shows scope + globals', async () => {
    const res = await request(app)
      .get(`/api/v1/scorm/packages?department=${otherTopDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    const titles = res.body.data.map((p: any) => p.title);
    expect(titles).toContain('Alpha Dept');
    expect(titles).toContain('Global Pkg');
    expect(titles).not.toContain('Beta Dept');
  });

  it('clones a global package into a target department', async () => {
    const globalPkg = await ScormPackage.findOne({ title: 'Global Pkg' });
    const res = await request(app)
      .post(`/api/v1/scorm/packages/${globalPkg!._id.toString()}/clone`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ department: topDepartmentId.toString() });

    expect(res.status).toBe(201);
    expect(res.body.data.department).toBe(topDepartmentId.toString());
    expect(res.body.data.isGlobal).toBe(false);
  });
});
