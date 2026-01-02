import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Learner from '../../../model/Academic/Learner';
import Admin from '../../../model/Staff/Admin';
import User from '../../../model/Auth/User';
import { hashPassword } from '../../../utils/helpers';

describe('Admin learner status actions', () => {
  const adminId = new mongoose.Types.ObjectId('00000000000000000000aa12');
  const learnerId = new mongoose.Types.ObjectId('00000000000000000000cc11');
  const programId = new mongoose.Types.ObjectId('00000000000000000000dd11');

  beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    await Admin.deleteMany({ _id: adminId });
    await Learner.deleteMany({ _id: learnerId });
    await User.deleteMany({ _id: { $in: [adminId, learnerId] } });

    const adminPassword = await hashPassword('Password123!');
    await Admin.create({
      _id: adminId,
      name: { first: 'Admin', last: 'User' },
      email: 'admin-learner@example.com',
    });
    await User.create({
      _id: adminId,
      email: 'admin-learner@example.com',
      passwordHash: adminPassword,
      role: 'global-admin',
      status: 'active',
    });

    const learnerPassword = await hashPassword('Password123!');
    await Learner.create({
      _id: learnerId,
      name: { first: 'Learner', last: 'User' },
      email: 'learner@example.com',
    });
    await User.create({
      _id: learnerId,
      email: 'learner@example.com',
      passwordHash: learnerPassword,
      role: 'learner',
      status: 'active',
    });
  });

  afterAll(async () => {
    await Admin.deleteMany({ _id: adminId });
    await Learner.deleteMany({ _id: learnerId });
    await User.deleteMany({ _id: { $in: [adminId, learnerId] } });
    await mongoose.connection.close();
  });

  it('suspends, unsuspends, withdraws, and unwithdraws a learner', async () => {
    const token = 'test-global-admin-token';

    const suspendRes = await request(app)
      .put(`/api/v1/staff/admins/suspend/learner/${learnerId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'policy', programId: programId.toString() });

    expect(suspendRes.status).toBe(200);
    const suspendedStatus = suspendRes.body.data.programEnrolmentStatuses.find(
      (entry: any) => entry.programId.toString() === programId.toString()
    );
    expect(suspendedStatus.status).toBe('suspended');

    const unsuspendRes = await request(app)
      .put(`/api/v1/staff/admins/unsuspend/learner/${learnerId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'reviewed', programId: programId.toString() });

    expect(unsuspendRes.status).toBe(200);
    const unsuspendedStatus = unsuspendRes.body.data.programEnrolmentStatuses.find(
      (entry: any) => entry.programId.toString() === programId.toString()
    );
    expect(unsuspendedStatus.status).toBe('active');

    const withdrawRes = await request(app)
      .put(`/api/v1/staff/admins/withdraw/learner/${learnerId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'leave', programId: programId.toString() });

    expect(withdrawRes.status).toBe(200);
    const withdrawnStatus = withdrawRes.body.data.programEnrolmentStatuses.find(
      (entry: any) => entry.programId.toString() === programId.toString()
    );
    expect(withdrawnStatus.status).toBe('withdrawn');

    const unwithdrawRes = await request(app)
      .put(`/api/v1/staff/admins/unwithdraw/learner/${learnerId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'returned', programId: programId.toString() });

    expect(unwithdrawRes.status).toBe(200);
    const unwithdrawnStatus = unwithdrawRes.body.data.programEnrolmentStatuses.find(
      (entry: any) => entry.programId.toString() === programId.toString()
    );
    expect(unwithdrawnStatus.status).toBe('active');
  });
});
