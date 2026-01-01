import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import MasterTemplate from '../../../model/Content/MasterTemplate';
import DepartmentMasterCSS from '../../../model/Content/DepartmentMasterCSS';

const masterToken = 'test-global-admin-token';
const topAdminToken = 'test-top-global-admin-token';

const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);
const topDepartmentId = new mongoose.Types.ObjectId('0000000000000000000000d1');

describe('Master Templates API', () => {
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
    await Promise.all([
      Department.deleteMany({}),
      MasterTemplate.deleteMany({}),
      DepartmentMasterCSS.deleteMany({}),
    ]);

    await Department.create([
      {
        _id: masterDepartmentId,
        name: 'Master Department',
        code: 'MASTER',
        level: 'master',
      },
      {
        _id: topDepartmentId,
        name: 'Top Alpha',
        code: 'ALPHA',
        level: 'top',
        parent: null,
        ancestors: [],
      },
    ]);
  });

  it('allows system admin to update master CSS', async () => {
    const res = await request(app)
      .put(`/api/v1/templates/departments/${topDepartmentId.toString()}/master-css`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ css: 'body { color: #111; }' });

    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.css).toContain('color');
  });

  it('rejects department admin master CSS updates', async () => {
    const res = await request(app)
      .put(`/api/v1/templates/departments/${topDepartmentId.toString()}/master-css`)
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({ css: 'body { color: #111; }' });

    expect(res.status).toBe(403);
  });

  it('creates a department template with pending override', async () => {
    await request(app)
      .put(`/api/v1/templates/departments/${topDepartmentId.toString()}/master-css`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ css: 'body { color: #000; }' });

    const res = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({
        name: 'Alpha Template',
        description: 'Dept template',
        type: 'custom',
        departmentId: topDepartmentId.toString(),
        css: 'body { color: #111; }',
        layout: {
          grid: 'single',
          regions: [{ id: 'hero', kind: 'custom', title: 'Hero' }],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.overrideStatus).toBe('pending');
    expect(res.body.data.isGlobal).toBe(false);
  });

  it('rejects global template creation by department admin', async () => {
    const res = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({
        name: 'Global Template',
        description: 'Global template',
        type: 'scorm',
        isGlobal: true,
        css: '',
        layout: {
          grid: 'single',
          regions: [{ id: 'lesson', kind: 'scorm', title: 'Lesson' }],
        },
      });

    expect(res.status).toBe(403);
  });

  it('allows system admin to create global templates', async () => {
    const res = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${masterToken}`)
      .send({
        name: 'Global Template',
        description: 'Global template',
        type: 'scorm',
        isGlobal: true,
        css: '',
        layout: {
          grid: 'single',
          regions: [{ id: 'lesson', kind: 'scorm', title: 'Lesson' }],
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.isGlobal).toBe(true);
  });

  it('scores CSS against master CSS', async () => {
    await request(app)
      .put(`/api/v1/templates/departments/${topDepartmentId.toString()}/master-css`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ css: 'body { color: #000; }' });

    const res = await request(app)
      .post('/api/v1/templates/score')
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({ departmentId: topDepartmentId.toString(), css: 'body { color: #111; }' });

    expect(res.status).toBe(200);
    expect(res.body.score.value).toBeDefined();
  });

  it('blocks publishing when override is pending', async () => {
    await request(app)
      .put(`/api/v1/templates/departments/${topDepartmentId.toString()}/master-css`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ css: 'body { color: #000; }' });

    const createRes = await request(app)
      .post('/api/v1/templates')
      .set('Authorization', `Bearer ${topAdminToken}`)
      .send({
        name: 'Alpha Template',
        description: 'Dept template',
        type: 'custom',
        departmentId: topDepartmentId.toString(),
        css: 'body { color: #111; }',
        layout: {
          grid: 'single',
          regions: [{ id: 'hero', kind: 'custom', title: 'Hero' }],
        },
      });

    const templateId = createRes.body.data.id;

    const publishRes = await request(app)
      .post(`/api/v1/templates/${templateId}/publish`)
      .set('Authorization', `Bearer ${topAdminToken}`);

    expect(publishRes.status).toBe(400);

    await request(app)
      .patch(`/api/v1/templates/${templateId}`)
      .set('Authorization', `Bearer ${masterToken}`)
      .send({ css: 'body { color: #111; }' });

    const approvedRes = await request(app)
      .post(`/api/v1/templates/${templateId}/publish`)
      .set('Authorization', `Bearer ${masterToken}`);

    expect(approvedRes.status).toBe(200);
  });
});
