import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Lookup from '../../../model/System/Lookup';

const adminToken = 'test-global-admin-token';

describe('Lists API', () => {
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
    await Lookup.deleteMany({ type: 'CourseStatus' });
  });

  it('returns course status list', async () => {
    const res = await request(app)
      .get('/api/v1/lists/course-statuses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const values = res.body.data.map((item: any) => item.value);
    expect(values).toEqual(expect.arrayContaining(['draft', 'rendered', 'published']));
  });
});
