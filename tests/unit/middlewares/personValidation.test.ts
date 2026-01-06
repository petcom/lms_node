/**
 * Person Validation Middleware Tests
 * DCV-002: Test requireUserExists validation for Admin, Staff, Learner
 */
import mongoose, { Schema } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../../model/Auth/User';
import Admin from '../../../model/Staff/Admin';
import Staff from '../../../model/Staff/Staff';
import Learner from '../../../model/Academic/Learner';

describe('Person Validation Middleware (DCV-002-005)', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Admin.deleteMany({});
    await Staff.deleteMany({});
    await Learner.deleteMany({});
  });

  describe('DCV-002: requireUserExists middleware', () => {
    describe('Admin model (DCV-003)', () => {
      it('should create Admin when matching User exists', async () => {
        // Create User first
        const user = await User.create({
          email: 'admin@example.com',
          passwordHash: 'hashedpassword123',
          roles: ['global-admin'],
        });

        // Create Admin with same _id
        const admin = await Admin.create({
          _id: user._id,
          name: { first: 'Test', last: 'Admin' },
          email: 'admin@example.com',
        });

        expect(admin._id.toString()).toBe(user._id.toString());
      });

      it('should throw error when creating Admin without matching User', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        await expect(
          Admin.create({
            _id: nonExistentId,
            name: { first: 'Test', last: 'Admin' },
            email: 'orphan@example.com',
          })
        ).rejects.toThrow(/No User exists with _id/);
      });

      it('should allow Admin creation when User exists (even for auto-generated pattern)', async () => {
        // The proper pattern is: ALWAYS create User first, then Admin with same _id
        // Auto-generated _id without User is now prevented by validation
        const user = await User.create({
          email: 'legacy@example.com',
          passwordHash: 'hashedpassword123',
          roles: ['global-admin'],
        });

        const admin = await Admin.create({
          _id: user._id,
          name: { first: 'Legacy', last: 'Admin' },
          email: 'legacy@example.com',
        });

        expect(admin._id.toString()).toBe(user._id.toString());
      });
    });

    describe('Staff model (DCV-004)', () => {
      it('should create Staff when matching User exists', async () => {
        const user = await User.create({
          email: 'staff@example.com',
          passwordHash: 'hashedpassword123',
          roles: ['staff'],
        });

        const staff = await Staff.create({
          _id: user._id,
          name: { first: 'Test', last: 'Staff' },
          email: 'staff@example.com',
          instructorId: 'TEA001TEST',
        });

        expect(staff._id.toString()).toBe(user._id.toString());
      });

      it('should throw error when creating Staff without matching User', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        await expect(
          Staff.create({
            _id: nonExistentId,
            name: { first: 'Orphan', last: 'Staff' },
            email: 'orphan-staff@example.com',
            instructorId: 'TEA002ORPHAN',
          })
        ).rejects.toThrow(/No User exists with _id/);
      });
    });

    describe('Learner model (DCV-005)', () => {
      it('should create Learner when matching User exists', async () => {
        const user = await User.create({
          email: 'learner@example.com',
          passwordHash: 'hashedpassword123',
          roles: ['learner'],
        });

        const learner = await Learner.create({
          _id: user._id,
          name: { first: 'Test', last: 'Learner' },
          email: 'learner@example.com',
        });

        expect(learner._id.toString()).toBe(user._id.toString());
      });

      it('should throw error when creating Learner without matching User', async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        await expect(
          Learner.create({
            _id: nonExistentId,
            name: { first: 'Orphan', last: 'Learner' },
            email: 'orphan-learner@example.com',
          })
        ).rejects.toThrow(/No User exists with _id/);
      });
    });

    describe('Multi-role person (shared _id)', () => {
      it('should allow same _id for Staff and Learner when User has both roles', async () => {
        const user = await User.create({
          email: 'multi-role@example.com',
          passwordHash: 'hashedpassword123',
          roles: ['staff', 'learner'],
        });

        // Create Staff record
        const staff = await Staff.create({
          _id: user._id,
          name: { first: 'Multi', last: 'Role' },
          email: 'multi-role@example.com',
          instructorId: 'TEA003MULTI',
        });

        // Create Learner record with same _id
        const learner = await Learner.create({
          _id: user._id,
          name: { first: 'Multi', last: 'Role' },
          email: 'multi-role@example.com',
        });

        expect(staff._id.toString()).toBe(user._id.toString());
        expect(learner._id.toString()).toBe(user._id.toString());
        expect(staff._id.toString()).toBe(learner._id.toString());
      });
    });
  });
});
