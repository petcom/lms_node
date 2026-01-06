/**
 * Staff Schema Cleanup Tests
 * DCV-021-023: Test removal of redundant fields from Staff schema
 * 
 * - DCV-021: Staff.email - derive from User
 * - DCV-022: Staff.department - use departmentMemberships
 * - DCV-023: Staff.academicYear - context from Calendar/Class
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Staff from '../../../model/Staff/Staff';
import User from '../../../model/Auth/User';
import Department from '../../../model/Academic/Department';

describe('Staff Schema Cleanup (DCV-021-023)', () => {
  let mongoServer: MongoMemoryServer;
  let department: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    
    // Create a department
    department = await Department.create({
      name: 'Engineering',
      code: 'ENG',
      level: 'top',
    });
  });

  describe('DCV-021: Staff.email removed - derive from User', () => {
    it('should not have email as a required field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      // email should either not exist or not be required
      if (schemaObj.email) {
        expect(schemaObj.email.required).not.toBe(true);
      }
    });

    it('should not persist email field when creating Staff', async () => {
      const user = await User.create({
        email: 'staff@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['staff'],
        primaryRole: 'staff',
        status: 'active',
      });

      const staff = await Staff.create({
        _id: user._id,
        name: { first: 'Test', last: 'Staff' },
        email: 'staff@test.com', // Try to set email
        status: 'active',
        applicationStatus: 'approved',
      } as any);

      const found = await Staff.findById(staff._id).lean();
      expect(found).not.toHaveProperty('email');
    });

    it('should provide getEmail() method to fetch email from User', async () => {
      const user = await User.create({
        email: 'staff@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['staff'],
        primaryRole: 'staff',
        status: 'active',
      });

      const staff = await Staff.create({
        _id: user._id,
        name: { first: 'Test', last: 'Staff' },
        status: 'active',
        applicationStatus: 'approved',
      });

      // Should have getEmail method
      expect(typeof staff.getEmail).toBe('function');
      
      const email = await staff.getEmail();
      expect(email).toBe('staff@test.com');
    });
  });

  describe('DCV-022: Staff.department removed - use departmentMemberships', () => {
    it('should not have department field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).not.toHaveProperty('department');
    });

    it('should not persist department field when creating Staff', async () => {
      const user = await User.create({
        email: 'staff@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['staff'],
        primaryRole: 'staff',
        status: 'active',
      });

      const staff = await Staff.create({
        _id: user._id,
        name: { first: 'Test', last: 'Staff' },
        department: department._id, // Try to set deprecated field
        departmentMemberships: [{
          departmentId: department._id,
          roles: ['instructor'],
        }],
        status: 'active',
        applicationStatus: 'approved',
      } as any);

      const found = await Staff.findById(staff._id).lean();
      expect(found).not.toHaveProperty('department');
    });

    it('should provide primaryDepartment virtual from departmentMemberships', async () => {
      const user = await User.create({
        email: 'staff@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['staff'],
        primaryRole: 'staff',
        status: 'active',
      });

      const staff = await Staff.create({
        _id: user._id,
        name: { first: 'Test', last: 'Staff' },
        departmentMemberships: [{
          departmentId: department._id,
          roles: ['instructor'],
        }],
        status: 'active',
        applicationStatus: 'approved',
      });

      // Check virtual or getter
      const primaryDept = staff.primaryDepartment || staff.getPrimaryDepartment?.();
      expect(primaryDept?.toString()).toBe(department._id.toString());
    });
  });

  describe('DCV-023: Staff.academicYear removed', () => {
    it('should not have academicYear field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).not.toHaveProperty('academicYear');
    });

    it('should not persist academicYear field when creating Staff', async () => {
      const user = await User.create({
        email: 'staff@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['staff'],
        primaryRole: 'staff',
        status: 'active',
      });

      const academicYearId = new mongoose.Types.ObjectId();

      const staff = await Staff.create({
        _id: user._id,
        name: { first: 'Test', last: 'Staff' },
        academicYear: academicYearId, // Try to set deprecated field
        status: 'active',
        applicationStatus: 'approved',
      } as any);

      const found = await Staff.findById(staff._id).lean();
      expect(found).not.toHaveProperty('academicYear');
    });
  });

  describe('DCV-036: Remove Staff legacy fields (course, program, programLevel, examsCreated)', () => {
    it('should not have course field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).not.toHaveProperty('course');
    });

    it('should not have program field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).not.toHaveProperty('program');
    });

    it('should not have programLevel field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).not.toHaveProperty('programLevel');
    });

    it('should not have examsCreated field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).not.toHaveProperty('examsCreated');
    });

    it('should not persist legacy fields when creating Staff', async () => {
      const user = await User.create({
        email: 'staff@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['staff'],
        primaryRole: 'staff',
        status: 'active',
      });

      const courseId = new mongoose.Types.ObjectId();
      const programId = new mongoose.Types.ObjectId();
      const programLevelId = new mongoose.Types.ObjectId();
      const examId = new mongoose.Types.ObjectId();

      const staff = await Staff.create({
        _id: user._id,
        name: { first: 'Test', last: 'Staff' },
        course: courseId,               // Try to set legacy field
        program: programId,             // Try to set legacy field
        programLevel: programLevelId,   // Try to set legacy field
        examsCreated: [examId],         // Try to set legacy field
        status: 'active',
        applicationStatus: 'approved',
      } as any);

      const found = await Staff.findById(staff._id).lean();
      expect(found).not.toHaveProperty('course');
      expect(found).not.toHaveProperty('program');
      expect(found).not.toHaveProperty('programLevel');
      expect(found).not.toHaveProperty('examsCreated');
    });

    it('should not have indexes on removed legacy fields', () => {
      const indexes = Staff.schema.indexes();
      const indexFields = indexes.map(([fields]) => Object.keys(fields)).flat();
      
      expect(indexFields).not.toContain('course');
      expect(indexFields).not.toContain('program');
      expect(indexFields).not.toContain('programLevel');
      expect(indexFields).not.toContain('examsCreated');
    });
  });

  describe('Essential fields preserved', () => {
    it('Staff should still have essential fields', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).toHaveProperty('name');
      expect(schemaObj).toHaveProperty('dateEmployed');
      expect(schemaObj).toHaveProperty('instructorId');
      // DCV-040: isWithdrawn/isSuspended replaced with status
      expect(schemaObj).toHaveProperty('status');
      expect(schemaObj).toHaveProperty('departmentMemberships');
      expect(schemaObj).toHaveProperty('applicationStatus');
      expect(schemaObj).toHaveProperty('createdBy');
    });

    it('should still require User to exist (DCV-004)', async () => {
      // Try to create Staff without User
      const staffId = new mongoose.Types.ObjectId();
      
      await expect(Staff.create({
        _id: staffId,
        name: { first: 'Test', last: 'Staff' },
        status: 'active',
        applicationStatus: 'approved',
      })).rejects.toThrow(/No User exists with _id/);
    });
  });
});
