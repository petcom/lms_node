import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Student from '../../../model/Academic/Student';
import Admin from '../../../model/Staff/Admin';
import { hashPassword } from '../../../utils/helpers';

describe('Admin student status actions', () => {
  const adminId = new mongoose.Types.ObjectId('00000000000000000000aa12');
  const studentId = new mongoose.Types.ObjectId('00000000000000000000cc11');

  beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    await Admin.deleteMany({ _id: adminId });
    await Student.deleteMany({ _id: studentId });

    await Admin.create({
      _id: adminId,
      name: 'Admin User',
      email: 'admin-student@example.com',
      password: await hashPassword('Password123!'),
      role: 'admin',
    });

    await Student.create({
      _id: studentId,
      name: 'Student User',
      email: 'student@example.com',
      password: await hashPassword('Password123!'),
      role: 'student',
      isSuspended: false,
      isWithdrawn: false,
    });
  });

  afterAll(async () => {
    await Admin.deleteMany({ _id: adminId });
    await Student.deleteMany({ _id: studentId });
    await mongoose.connection.close();
  });

  it('suspends, unsuspends, withdraws, and unwithdraws a student', async () => {
    const token = 'test-admin-token';

    const suspendRes = await request(app)
      .put(`/api/v1/admins/suspend/student/${studentId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'policy' });

    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.isSuspended).toBe(true);

    const unsuspendRes = await request(app)
      .put(`/api/v1/admins/unsuspend/student/${studentId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'reviewed' });

    expect(unsuspendRes.status).toBe(200);
    expect(unsuspendRes.body.data.isSuspended).toBe(false);

    const withdrawRes = await request(app)
      .put(`/api/v1/admins/withdraw/student/${studentId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'leave' });

    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.isWithdrawn).toBe(true);

    const unwithdrawRes = await request(app)
      .put(`/api/v1/admins/unwithdraw/student/${studentId.toString()}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'returned' });

    expect(unwithdrawRes.status).toBe(200);
    expect(unwithdrawRes.body.data.isWithdrawn).toBe(false);
  });
});
