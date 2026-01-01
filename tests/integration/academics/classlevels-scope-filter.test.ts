import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ClassLevel from '../../../model/Academic/ClassLevel';
import Department from '../../../model/Academic/Department';

const masterToken = 'test-global-admin-token';
const topAdminToken = 'test-top-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);
const topDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d1');
const otherTopDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d3');

const baseClass = (name: string, department: mongoose.Types.ObjectId) => ({
  name,
  description: `${name} desc`,
  createdBy: masterAdminId,
  department,
});

describe('Class levels listing department filtering', () => {
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
    await ClassLevel.deleteMany({});
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

    await ClassLevel.create(baseClass('Level Alpha', topDepartmentId));
    await ClassLevel.create(baseClass('Level Beta', otherTopDepartmentId));
  });

  it('allows master admin to filter by department query', async () => {
    const res = await request(app)
      .get(`/api/v1/class-levels?department=${otherTopDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Level Beta');
  });

  it('ignores out-of-scope department filters for non-master admins', async () => {
    const res = await request(app)
      .get(`/api/v1/class-levels?department=${otherTopDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    const names = res.body.data.map((c: any) => c.name);
    expect(names).toContain('Level Alpha');
    expect(names).not.toContain('Level Beta');
  });
});
