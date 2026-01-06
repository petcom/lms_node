/**
 * EVIP Phase 1: Email Field Removal Tests
 * 
 * Tests for DCV-021 (Staff), DCV-039 (Admin), DCV-041 (Learner)
 * Email should only be stored in User model, not person models
 */
import mongoose from 'mongoose';
import User from '../../../model/Auth/User';
import Learner from '../../../model/Academic/Learner';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';
import { hashPassword } from '../../../utils/helpers';

describe('EVIP Phase 1: Email Field Storage (DCV-021, DCV-039, DCV-041)', () => {
  // Use unique random IDs to avoid conflicts with other tests
  const uniquePrefix = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const testIds = {
    learner: new mongoose.Types.ObjectId(),
    staff: new mongoose.Types.ObjectId(),
    admin: new mongoose.Types.ObjectId(),
  };
  
  const testEmails = {
    learner: `evip-learner-${uniquePrefix}@test.com`,
    staff: `evip-staff-${uniquePrefix}@test.com`,
    admin: `evip-admin-${uniquePrefix}@test.com`,
  };

  beforeAll(async () => {
    // Ensure connection
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({ _id: { $in: Object.values(testIds) } });
    await Learner.deleteMany({ _id: testIds.learner });
    await Staff.deleteMany({ _id: testIds.staff });
    await Admin.deleteMany({ _id: testIds.admin });

    const passwordHash = await hashPassword('TestPassword123!');

    // Create Learner with User
    await User.create({
      _id: testIds.learner,
      email: testEmails.learner,
      passwordHash,
      roles: ['learner'],
      primaryRole: 'learner',
      status: 'active',
    });
    await Learner.create({
      _id: testIds.learner,
      name: { first: 'Test', last: 'Learner' },
    });

    // Create Staff with User
    await User.create({
      _id: testIds.staff,
      email: testEmails.staff,
      passwordHash,
      roles: ['staff'],
      primaryRole: 'staff',
      status: 'active',
    });
    await Staff.create({
      _id: testIds.staff,
      name: { first: 'Test', last: 'Staff' },
      departmentMemberships: [],
    });

    // Create Admin with User
    await User.create({
      _id: testIds.admin,
      email: testEmails.admin,
      passwordHash,
      roles: ['global-admin'],
      primaryRole: 'global-admin',
      status: 'active',
    });
    await Admin.create({
      _id: testIds.admin,
      name: { first: 'Test', last: 'Admin' },
    });
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({ _id: { $in: Object.values(testIds) } });
    await Learner.deleteMany({ _id: testIds.learner });
    await Staff.deleteMany({ _id: testIds.staff });
    await Admin.deleteMany({ _id: testIds.admin });
  });

  describe('DCV-041: Learner email via getEmail() method', () => {
    it('should retrieve email from User via getEmail() method', async () => {
      const learner = await Learner.findById(testIds.learner);
      expect(learner).toBeDefined();
      const email = await learner?.getEmail();
      expect(email).toBe(testEmails.learner);
    });

    it('should not have email stored directly on Learner document', async () => {
      const learner = await Learner.findById(testIds.learner).lean();
      expect((learner as any).email).toBeUndefined();
    });

    it('updating User email should be reflected in getEmail()', async () => {
      const updatedEmail = `evip-learner-updated-${uniquePrefix}@test.com`;
      await User.findByIdAndUpdate(testIds.learner, { email: updatedEmail });
      
      const learner = await Learner.findById(testIds.learner);
      const email = await learner?.getEmail();
      expect(email).toBe(updatedEmail);
    });
  });

  describe('DCV-021: Staff email via getEmail() method', () => {
    it('should retrieve email from User via getEmail() method', async () => {
      const staff = await Staff.findById(testIds.staff);
      expect(staff).toBeDefined();
      const email = await staff?.getEmail();
      expect(email).toBe(testEmails.staff);
    });

    it('should not have email stored directly on Staff document', async () => {
      const staff = await Staff.findById(testIds.staff).lean();
      expect((staff as any).email).toBeUndefined();
    });

    it('updating User email should be reflected in getEmail()', async () => {
      const updatedEmail = `evip-staff-updated-${uniquePrefix}@test.com`;
      await User.findByIdAndUpdate(testIds.staff, { email: updatedEmail });
      
      const staff = await Staff.findById(testIds.staff);
      const email = await staff?.getEmail();
      expect(email).toBe(updatedEmail);
    });
  });

  describe('DCV-039: Admin email via getEmail() method', () => {
    it('should retrieve email from User via getEmail() method', async () => {
      const admin = await Admin.findById(testIds.admin);
      expect(admin).toBeDefined();
      const email = await admin?.getEmail();
      expect(email).toBe(testEmails.admin);
    });

    it('should not have email stored directly on Admin document', async () => {
      const admin = await Admin.findById(testIds.admin).lean();
      expect((admin as any).email).toBeUndefined();
    });

    it('updating User email should be reflected in getEmail()', async () => {
      const updatedEmail = `evip-admin-updated-${uniquePrefix}@test.com`;
      await User.findByIdAndUpdate(testIds.admin, { email: updatedEmail });
      
      const admin = await Admin.findById(testIds.admin);
      const email = await admin?.getEmail();
      expect(email).toBe(updatedEmail);
    });
  });

  describe('Learner model does not accept email field in schema', () => {
    it('should ignore email field when creating Learner', async () => {
      const newId = new mongoose.Types.ObjectId();
      const passwordHash = await hashPassword('TestPassword123!');
      const userEmail = `evip-ignored-${uniquePrefix}@test.com`;
      
      await User.create({
        _id: newId,
        email: userEmail,
        passwordHash,
        roles: ['learner'],
        primaryRole: 'learner',
        status: 'active',
      });
      
      // Attempt to create Learner with email field (should be ignored)
      const learner = await Learner.create({
        _id: newId,
        name: { first: 'New', last: 'Learner' },
        email: 'should-be-ignored@test.com', // This should be ignored
      } as any);
      
      // Email should not be stored on Learner
      const raw = await Learner.findById(newId).lean();
      expect((raw as any).email).toBeUndefined();
      
      // But getEmail() should return User's email
      const email = await learner.getEmail();
      expect(email).toBe(userEmail);
      
      // Cleanup
      await User.findByIdAndDelete(newId);
      await Learner.findByIdAndDelete(newId);
    });
  });

  describe('Staff model does not accept email field in schema', () => {
    it('should ignore email field when creating Staff', async () => {
      const newId = new mongoose.Types.ObjectId();
      const passwordHash = await hashPassword('TestPassword123!');
      const userEmail = `evip-ignored-staff-${uniquePrefix}@test.com`;
      
      await User.create({
        _id: newId,
        email: userEmail,
        passwordHash,
        roles: ['staff'],
        primaryRole: 'staff',
        status: 'active',
      });
      
      // Attempt to create Staff with email field (should be ignored)
      const staff = await Staff.create({
        _id: newId,
        name: { first: 'New', last: 'Staff' },
        departmentMemberships: [],
        email: 'should-be-ignored@test.com', // This should be ignored
      } as any);
      
      // Email should not be stored on Staff
      const raw = await Staff.findById(newId).lean();
      expect((raw as any).email).toBeUndefined();
      
      // But getEmail() should return User's email
      const email = await staff.getEmail();
      expect(email).toBe(userEmail);
      
      // Cleanup
      await User.findByIdAndDelete(newId);
      await Staff.findByIdAndDelete(newId);
    });
  });
});
