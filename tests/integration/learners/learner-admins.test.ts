import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Admin from '../../../model/Staff/Admin';
import Learner from '../../../model/Academic/Learner';
import User from '../../../model/Auth/User';

const adminToken = 'test-global-admin-token';
const masterAdminId = new mongoose.Types.ObjectId('0000000000000000000000a1');

const registerLearner = async (overrides?: { email?: string }) => {
  const payload = {
    name: { first: 'Ada', last: 'Lovelace' },
    email: overrides?.email || 'learner-ada@example.com',
    password: 'Str0ngPassw0rd!',
  };

  const res = await request(app)
    .post('/api/v1/learners/admins/register')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(payload);

  return res;
};

describe('Learner admin routes', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Promise.all([Admin.deleteMany({}), Learner.deleteMany({}), User.deleteMany({})]);
    // DCV-002: Create User first, then Admin with same _id
    await User.create({
      _id: masterAdminId,
      email: 'global-admin@example.com',
      passwordHash: '$2a$10$exampleHash',
      roles: ['global-admin'],
      primaryRole: 'global-admin',
      status: 'active',
    });
    await Admin.create({
      _id: masterAdminId,
      name: { first: 'Global', last: 'Admin' },
      email: 'global-admin@example.com',
    });
  });

  it('registers a learner via /learners/admins/register', async () => {
    const res = await registerLearner();
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('learner-ada@example.com');

    const user = await User.findOne({ email: 'learner-ada@example.com' }).lean();
    expect(user).toBeTruthy();
    // DCV-001: Check roles array instead of role field
    expect(user?.roles).toContain('learner');
  });

  it('lists learners via /learners/admins', async () => {
    await registerLearner();

    const res = await request(app)
      .get('/api/v1/learners/admins')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const emails = res.body.data.map((item: any) => item.email);
    expect(emails).toContain('learner-ada@example.com');
  });

  it('gets and updates a learner via admin routes', async () => {
    const registerRes = await registerLearner({ email: 'learner-grace@example.com' });
    const learnerId = registerRes.body.data._id;

    const getRes = await request(app)
      .get(`/api/v1/learners/${learnerId}/admins`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.email).toBe('learner-grace@example.com');

    const updateRes = await request(app)
      .put(`/api/v1/learners/${learnerId}/update/admins`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: { first: 'Grace', last: 'Hopper' },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name.first).toBe('Grace');
    expect(updateRes.body.data.name.last).toBe('Hopper');
  });
});
