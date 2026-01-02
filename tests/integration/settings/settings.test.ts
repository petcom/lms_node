import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Settings from '../../../model/System/Settings';

describe('Settings API', () => {
  const adminToken = 'test-global-admin-token';

  beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    await Settings.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Settings.deleteMany({});
  });

  it('returns default settings for global admin', async () => {
    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('pagination');
    expect(res.body.data.pagination.defaultLimit).toBe(10);
    expect(res.body.data.pagination.maxLimit).toBe(100);
  });

  it('updates pagination settings', async () => {
    const updateRes = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        pagination: {
          defaultLimit: 15,
          overrides: {
            content: { limit: 20, maxLimit: 50 },
          },
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.pagination.defaultLimit).toBe(15);
    expect(updateRes.body.data.pagination.overrides.content.limit).toBe(20);

    const res = await request(app)
      .get('/api/v1/settings')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.defaultLimit).toBe(15);
    expect(res.body.data.pagination.overrides.content.maxLimit).toBe(50);
  });

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/settings');
    expect(res.status).toBe(401);
  });
});
