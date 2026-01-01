import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';
import { hashPassword } from '../../../utils/helpers';

describe('Admin teacher status actions', () => {
  const adminId = new mongoose.Types.ObjectId('00000000000000000000aa11');
  const teacherId = new mongoose.Types.ObjectId('00000000000000000000bb11');

  beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    await Admin.deleteMany({ _id: adminId });
    await Staff.deleteMany({ _id: teacherId });

    await Admin.create({
      _id: adminId,
      name: 'Admin User',
      email: 'admin@example.com',
      password: await hashPassword('Password123!'),
      role: 'admin',
    });

    await Staff.create({
      _id: teacherId,
      name: 'Teacher User',
      email: 'teacher@example.com',
      password: await hashPassword('Password123!'),
      role: 'teacher',
      isSuspended: false,
      isWithdrawn: false,
    });
  });

  afterAll(async () => {
    await Admin.deleteMany({ _id: adminId });
    await Staff.deleteMany({ _id: teacherId });
    await mongoose.connection.close();
  });

  it('suspends, unsuspends, withdraws, and unwithdraws a teacher', async () => {
    const token = 'test-admin-token';

    const suspendRes = await request(app)
      .put(`/api/v1/admins/suspend/staff/${teacherId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'policy' });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.isSuspended).toBe(true);

    const unsuspendRes = await request(app)
      .put(`/api/v1/admins/unsuspend/staff/${teacherId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'reviewed' });

    expect(unsuspendRes.status).toBe(200);
    expect(unsuspendRes.body.data.isSuspended).toBe(false);

    const withdrawRes = await request(app)
      .put(`/api/v1/admins/withdraw/staff/${teacherId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'leave' });

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.isWithdrawn).toBe(true);

    const unwithdrawRes = await request(app)
      .put(`/api/v1/admins/unwithdraw/staff/${teacherId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'returned' });

    expect(unwithdrawRes.status).toBe(200);
    expect(unwithdrawRes.body.data.isWithdrawn).toBe(false);
  });
});
