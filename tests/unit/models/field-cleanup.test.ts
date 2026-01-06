/**
 * Field Cleanup Tests (Phase 8)
 * DCV-037: Remove Course.description (use shortDescription/longDescription)
 * DCV-039: Remove Admin.email - derive from User
 * DCV-041: Remove Learner.email - derive from User
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Course from '../../../model/Content/Course';
import Admin from '../../../model/Staff/Admin';
import Learner from '../../../model/Academic/Learner';
import User from '../../../model/Auth/User';
import Program from '../../../model/Academic/Program';
import Department from '../../../model/Academic/Department';

describe('Field Cleanup (DCV-037, DCV-039, DCV-041)', () => {
  let mongoServer: MongoMemoryServer;
  let department: any;
  let program: any;
  let adminUser: any;

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
    
    // Create test fixtures
    department = await Department.create({
      name: 'Test Department',
      code: 'TEST',
      level: 'top',
    });
    
    adminUser = await User.create({
      email: 'admin@test.com',
      passwordHash: '$2a$10$mockhashedpassword',
      roles: ['global-admin'],
      primaryRole: 'global-admin',
      status: 'active',
    });
    
    await Admin.create({
      _id: adminUser._id,
      name: { first: 'Test', last: 'Admin' },
      department: department._id,
    });
    
    program = await Program.create({
      name: 'Test Program',
      description: 'Test program description',
      createdBy: adminUser._id,
      department: department._id,
    });
  });

  describe('DCV-037: Remove Course.description', () => {
    it('should not have description field in Course schema', () => {
      const schemaObj = Course.schema.obj;
      expect(schemaObj).not.toHaveProperty('description');
    });

    it('should still have shortDescription and longDescription fields', () => {
      const schemaObj = Course.schema.obj;
      expect(schemaObj).toHaveProperty('shortDescription');
      expect(schemaObj).toHaveProperty('longDescription');
    });

    it('should not persist description field when creating Course', async () => {
      const course = await Course.create({
        title: 'Test Course',
        description: 'This should not be saved', // Try to set deprecated field
        shortDescription: 'Short desc',
        longDescription: 'Long description here',
        program: program._id,
        createdBy: adminUser._id,
      } as any);

      const found = await Course.findById(course._id).lean();
      expect(found).not.toHaveProperty('description');
      expect(found).toHaveProperty('shortDescription', 'Short desc');
      expect(found).toHaveProperty('longDescription', 'Long description here');
    });
  });

  describe('DCV-039: Remove Admin.email', () => {
    it('should not have email field in Admin schema', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).not.toHaveProperty('email');
    });

    it('should not persist email field when creating Admin', async () => {
      const user = await User.create({
        email: 'newadmin@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['global-admin'],
        primaryRole: 'global-admin',
        status: 'active',
      });

      const admin = await Admin.create({
        _id: user._id,
        name: { first: 'New', last: 'Admin' },
        email: 'newadmin@test.com', // Try to set deprecated field
        department: department._id,
      } as any);

      const found = await Admin.findById(admin._id).lean();
      expect(found).not.toHaveProperty('email');
    });

    it('should provide getEmail() method to fetch email from User', async () => {
      const user = await User.create({
        email: 'getmail@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['global-admin'],
        primaryRole: 'global-admin',
        status: 'active',
      });

      const admin = await Admin.create({
        _id: user._id,
        name: { first: 'Get', last: 'Mail' },
        department: department._id,
      });

      expect(typeof admin.getEmail).toBe('function');
      const email = await admin.getEmail();
      expect(email).toBe('getmail@test.com');
    });

    it('should not have email index on Admin', () => {
      const indexes = Admin.schema.indexes();
      const indexFields = indexes.map(([fields]) => Object.keys(fields)).flat();
      expect(indexFields).not.toContain('email');
    });
  });

  describe('DCV-041: Remove Learner.email', () => {
    it('should not have email field in Learner schema', () => {
      const schemaObj = Learner.schema.obj;
      expect(schemaObj).not.toHaveProperty('email');
    });

    it('should not persist email field when creating Learner', async () => {
      const user = await User.create({
        email: 'learner@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['learner'],
        primaryRole: 'learner',
        status: 'active',
      });

      const learner = await Learner.create({
        _id: user._id,
        name: { first: 'Test', last: 'Learner' },
        email: 'learner@test.com', // Try to set deprecated field
        dateAdmitted: new Date(),
      } as any);

      const found = await Learner.findById(learner._id).lean();
      expect(found).not.toHaveProperty('email');
    });

    it('should provide getEmail() method to fetch email from User', async () => {
      const user = await User.create({
        email: 'learnermail@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['learner'],
        primaryRole: 'learner',
        status: 'active',
      });

      const learner = await Learner.create({
        _id: user._id,
        name: { first: 'Learner', last: 'Mail' },
        dateAdmitted: new Date(),
      });

      expect(typeof learner.getEmail).toBe('function');
      const email = await learner.getEmail();
      expect(email).toBe('learnermail@test.com');
    });

    it('should not have email index on Learner', () => {
      const indexes = Learner.schema.indexes();
      const indexFields = indexes.map(([fields]) => Object.keys(fields)).flat();
      expect(indexFields).not.toContain('email');
    });
  });

  describe('Essential Course fields preserved', () => {
    it('Course should still have essential fields', () => {
      const schemaObj = Course.schema.obj;
      expect(schemaObj).toHaveProperty('title');
      expect(schemaObj).toHaveProperty('shortDescription');
      expect(schemaObj).toHaveProperty('longDescription');
      expect(schemaObj).toHaveProperty('program');
      expect(schemaObj).toHaveProperty('programLevel');
      expect(schemaObj).toHaveProperty('department');
      expect(schemaObj).toHaveProperty('status');
      expect(schemaObj).toHaveProperty('primaryInstructors');
      expect(schemaObj).toHaveProperty('secondaryInstructors');
      expect(schemaObj).toHaveProperty('createdBy');
    });
  });
});
