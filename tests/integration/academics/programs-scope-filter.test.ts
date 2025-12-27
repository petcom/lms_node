import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Program from '../../../model/Academic/Program';
import Department from '../../../model/Academic/Department';

const masterToken = 'test-admin-token';
const topAdminToken = 'test-top-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const masterDepartmentId = new mongoose.Types.ObjectId(process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00');
const topDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d1');
const otherTopDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d3');

describe('Programs listing department filtering', () => {
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
    await Program.deleteMany({});
    await Department.deleteMany({});

    await Department.create({
      _id: masterDepartmentId,
      name: 'Master Department',
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

    await Program.create({
      name: 'Program Alpha',
      description: 'Alpha desc',
      duration: '4 years',
      createdBy: masterAdminId,
      department: topDepartmentId,
    });

    await Program.create({
      name: 'Program Beta',
      description: 'Beta desc',
      duration: '4 years',
      createdBy: masterAdminId,
      department: otherTopDepartmentId,
    });
  });

  it('allows master admin to filter by department query', async () => {
    const res = await request(app)
      .get(`/api/v1/programs?department=${otherTopDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Program Beta');
  });

  it('ignores out-of-scope department filters for non-master admins', async () => {
    const res = await request(app)
      .get(`/api/v1/programs?department=${otherTopDepartmentId.toString()}`)
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(res.status).toBe(200);
    const names = res.body.data.map((p: any) => p.name);
    expect(names).toContain('Program Alpha');
    expect(names).not.toContain('Program Beta');
  });
});
