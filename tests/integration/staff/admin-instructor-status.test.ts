import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';
import User from '../../../model/Auth/User';
import { hashPassword } from '../../../utils/helpers';

describe('Admin instructor status actions', () => {
  const adminId = new mongoose.Types.ObjectId('00000000000000000000aa11');
  const instructorId = new mongoose.Types.ObjectId('00000000000000000000bb11');

  beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    await Admin.deleteMany({ _id: adminId });
    await Staff.deleteMany({ _id: instructorId });
    await User.deleteMany({ _id: { $in: [adminId, instructorId] } });

    const adminPassword = await hashPassword('Password123!');

    // Create User FIRST (required by personValidation middleware)
    await User.create({
      _id: adminId,
      email: 'admin@example.com',
      passwordHash: adminPassword,
      roles: ['global-admin'],
      primaryRole: 'global-admin',
      status: 'active',
    });
    // THEN create Admin with same _id
    await Admin.create({
      _id: adminId,
      name: { first: 'Admin', last: 'User' },
      email: 'admin@example.com',
    });

    const staffPassword = await hashPassword('Password123!');

    // Create User FIRST (required by personValidation middleware)
    await User.create({
      _id: instructorId,
      email: 'instructor@example.com',
      passwordHash: staffPassword,
      roles: ['staff'],
      primaryRole: 'staff',
      status: 'active',
    });
    // THEN create Staff with same _id
    await Staff.create({
      _id: instructorId,
      name: { first: 'Staff', last: 'User' },
      email: 'instructor@example.com',
      isSuspended: false,
      isWithdrawn: false,
    });
  });

  afterAll(async () => {
    await Admin.deleteMany({ _id: adminId });
    await Staff.deleteMany({ _id: instructorId });
    await User.deleteMany({ _id: { $in: [adminId, instructorId] } });
    await mongoose.connection.close();
  });

  it('suspends, unsuspends, withdraws, and unwithdraws a instructor', async () => {
    const token = 'test-global-admin-token';

    const suspendRes = await request(app)
      .put(`/api/v1/staff/admins/suspend/staff/${instructorId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'policy' });

    expect(suspendRes.status).toBe(200);
    // DCV-040: Uses status enum instead of isSuspended boolean
    expect(suspendRes.body.data.status).toBe('suspended');

    const unsuspendRes = await request(app)
      .put(`/api/v1/staff/admins/unsuspend/staff/${instructorId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'reviewed' });

    expect(unsuspendRes.status).toBe(200);
    expect(unsuspendRes.body.data.status).toBe('active');

    const withdrawRes = await request(app)
      .put(`/api/v1/staff/admins/withdraw/staff/${instructorId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'leave' });

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.status).toBe('withdrawn');

    const unwithdrawRes = await request(app)
      .put(`/api/v1/staff/admins/unwithdraw/staff/${instructorId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'returned' });

    expect(unwithdrawRes.status).toBe(200);
    expect(unwithdrawRes.body.data.status).toBe('active');
  });
});
