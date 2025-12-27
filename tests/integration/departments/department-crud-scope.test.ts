import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';

const masterToken = 'test-admin-token';
const topAdminToken = 'test-top-admin-token';
const subAdminToken = 'test-sub-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00');
const topDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d1');
const subDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d2');
const otherTopDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d3');
const orphanDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d4');

describe('Departments API (scope + CRUD)', () => {
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
    await Department.deleteMany({});
    await Program.deleteMany({});

    await Department.create({
      _id: masterDepartmentId,
      name: 'Master Department',
      code: 'MASTER',
      level: 'master',
    });

    await Department.create({
      _id: topDepartmentId,
      name: 'Top Alpha',
      code: 'ALPHA',
      level: 'top',
      parent: null,
      ancestors: [],
    });

    await Department.create({
      _id: subDepartmentId,
      name: 'Sub Alpha',
      code: 'ALPHA-S',
      level: 'sub',
      parent: topDepartmentId,
      ancestors: [topDepartmentId],
    });

    await Department.create({
      _id: otherTopDepartmentId,
      name: 'Top Beta',
      code: 'BETA',
      level: 'top',
      parent: null,
      ancestors: [],
    });
  });

  it('allows master admin to create a top-level department', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ name: 'Top Gamma', level: 'top', code: 'GAMMA' });

    expect(res.status).toBe(201);
    expect(res.body.data.level).toBe('top');
    expect(res.body.data.parent).toBeNull();
  });

  it('allows top-level admin to create a sub-department under their scope', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({ name: 'Sub New', level: 'sub', parent: topDepartmentId.toString() });

    expect(res.status).toBe(201);
    expect(res.body.data.parent).toBe(topDepartmentId.toString());
  });

  it('blocks top-level admin from creating a new top-level department', async () => {
    const res = await request(app)
      .post('/api/v1/departments')
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({ name: 'Blocked Top', level: 'top' });

    expect(res.status).toBe(403);
  });

  it('scopes list to the admin hierarchy and returns counts', async () => {
    await Program.create({
      name: 'Alpha Program',
      description: 'Program for Alpha dept',
      duration: '4 years',
      createdBy: masterAdminId,
      department: topDepartmentId,
    });

    const res = await request(app)
      .get('/api/v1/departments?limit=50')
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    const names = res.body.data.map((d: any) => d.name);
    expect(names).toContain('Top Alpha');
    expect(names).toContain('Sub Alpha');
    expect(names).not.toContain('Top Beta');

    const alpha = res.body.data.find((d: any) => d._id === topDepartmentId.toString());
    expect(alpha.counts.programCount).toBe(1);
    expect(alpha.counts.staffCount).toBe(0);
  });

  it('prevents deleting non-empty or parent departments', async () => {
    await Department.create({
      _id: orphanDepartmentId,
      name: 'Orphan Top',
      code: 'ORPH',
      level: 'top',
      parent: null,
      ancestors: [],
    });

    await Program.create({
      name: 'Orphan Program',
      description: 'Attached to orphan dept',
      duration: '1 year',
      createdBy: masterAdminId,
      department: orphanDepartmentId,
    });

    const resWithChild = await request(app)
      .delete(`/api/v1/departments/${topDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${masterToken}`);
    expect(resWithChild.status).toBe(400);

    const resWithContent = await request(app)
      .delete(`/api/v1/departments/${orphanDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${masterToken}`);
    expect(resWithContent.status).toBe(400);
  });

  it('forbids deleting the master department and out-of-scope departments', async () => {
    const resMaster = await request(app)
      .delete(`/api/v1/departments/${masterDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${masterToken}`);
    expect(resMaster.status).toBe(403);

    const resOutOfScope = await request(app)
      .delete(`/api/v1/departments/${otherTopDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${subAdminToken}`);
    expect(resOutOfScope.status).toBe(403);
  });
});
