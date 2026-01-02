import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Learner from '../../../model/Academic/Learner';
import Admin from '../../../model/Staff/Admin';
import { hashPassword } from '../../../utils/helpers';

describe('Admin learner status actions', () => {
  const adminId = new mongoose.Types.ObjectId('00000000000000000000aa12');
  const learnerId = new mongoose.Types.ObjectId('00000000000000000000cc11');

  beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    await Admin.deleteMany({ _id: adminId });
    await Learner.deleteMany({ _id: learnerId });

    await Admin.create({
      _id: adminId,
      name: { first: 'Admin', last: 'User' },
      email: 'admin-learner@example.com',
      password: await hashPassword('Password123!'),
      role: 'global-admin',
    });

    await Learner.create({
      _id: learnerId,
      name: { first: 'Learner', last: 'User' },
      email: 'learner@example.com',
      password: await hashPassword('Password123!'),
      role: 'learner',
      isSuspended: false,
      isWithdrawn: false,
    });
  });

  afterAll(async () => {
    await Admin.deleteMany({ _id: adminId });
    await Learner.deleteMany({ _id: learnerId });
    await mongoose.connection.close();
  });

  it('suspends, unsuspends, withdraws, and unwithdraws a learner', async () => {
    const token = 'test-global-admin-token';

    const suspendRes = await request(app)
      .put(`/api/v1/staff/admins/suspend/learner/${learnerId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'policy' });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.isSuspended).toBe(true);

    const unsuspendRes = await request(app)
      .put(`/api/v1/staff/admins/unsuspend/learner/${learnerId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'reviewed' });

    expect(unsuspendRes.status).toBe(200);
    expect(unsuspendRes.body.data.isSuspended).toBe(false);

    const withdrawRes = await request(app)
      .put(`/api/v1/staff/admins/withdraw/learner/${learnerId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'leave' });

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.isWithdrawn).toBe(true);

    const unwithdrawRes = await request(app)
      .put(`/api/v1/staff/admins/unwithdraw/learner/${learnerId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'returned' });

    expect(unwithdrawRes.status).toBe(200);
    expect(unwithdrawRes.body.data.isWithdrawn).toBe(false);
  });
});
