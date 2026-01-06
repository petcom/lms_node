/**
 * Schema Cleanup Tests - Remove Orphaned Arrays
 * DCV-013-016: Test that orphaned arrays have been removed from Program and Admin schemas
 * 
 * These arrays were identified as redundant because:
 * - Program.learners → Derive from ProgramEnrollment
 * - Program.instructors → Derive from Course.primaryInstructors/secondaryInstructors
 * - Program.courses → Derive from ProgramLevel.courses
 * - Admin.* arrays → Global admins access all resources via role, not array membership
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Program from '../../../model/Academic/Program';
import Admin from '../../../model/Staff/Admin';
import User from '../../../model/Auth/User';

describe('Schema Cleanup - Remove Orphaned Arrays (DCV-013-016)', () => {
  let mongoServer: MongoMemoryServer;

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
  });

  describe('DCV-013: Program.learners array removed', () => {
    it('should not have learners field in Program schema', () => {
      const schemaObj = Program.schema.obj;
      expect(schemaObj).not.toHaveProperty('learners');
    });

    it('should not persist learners field when creating a Program', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const deptId = new mongoose.Types.ObjectId();
      const learnerId = new mongoose.Types.ObjectId();

      const program = await Program.create({
        name: 'Test Program',
        description: 'Test Description',
        duration: '4 years',
        createdBy: adminId,
        department: deptId,
        learners: [learnerId], // Try to set orphaned field
      } as any);

      // Field should not be saved
      const found = await Program.findById(program._id).lean();
      expect(found).not.toHaveProperty('learners');
    });
  });

  describe('DCV-014: Program.instructors array removed', () => {
    it('should not have instructors field in Program schema', () => {
      const schemaObj = Program.schema.obj;
      expect(schemaObj).not.toHaveProperty('instructors');
    });

    it('should not persist instructors field when creating a Program', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const deptId = new mongoose.Types.ObjectId();
      const instructorId = new mongoose.Types.ObjectId();

      const program = await Program.create({
        name: 'Test Program',
        description: 'Test Description',
        duration: '4 years',
        createdBy: adminId,
        department: deptId,
        instructors: [instructorId], // Try to set orphaned field
      } as any);

      const found = await Program.findById(program._id).lean();
      expect(found).not.toHaveProperty('instructors');
    });
  });

  describe('DCV-015: Program.courses array removed', () => {
    it('should not have courses field in Program schema', () => {
      const schemaObj = Program.schema.obj;
      expect(schemaObj).not.toHaveProperty('courses');
    });

    it('should not persist courses field when creating a Program', async () => {
      const adminId = new mongoose.Types.ObjectId();
      const deptId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();

      const program = await Program.create({
        name: 'Test Program',
        description: 'Test Description',
        duration: '4 years',
        createdBy: adminId,
        department: deptId,
        courses: [courseId], // Try to set orphaned field
      } as any);

      const found = await Program.findById(program._id).lean();
      expect(found).not.toHaveProperty('courses');
    });
  });

  describe('DCV-016: Admin orphaned arrays removed', () => {
    it('should not have programs field in Admin schema', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).not.toHaveProperty('programs');
    });

    it('should not have instructors field in Admin schema', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).not.toHaveProperty('instructors');
    });

    it('should not have learners field in Admin schema', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).not.toHaveProperty('learners');
    });

    it('should not have courses field in Admin schema', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).not.toHaveProperty('courses');
    });

    it('should not have academicTerms field in Admin schema', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).not.toHaveProperty('academicTerms');
    });

    it('should not have yearGroups field in Admin schema', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).not.toHaveProperty('yearGroups');
    });

    it('should not have academicYears field in Admin schema', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).not.toHaveProperty('academicYears');
    });

    it('should not have programLevels field in Admin schema', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).not.toHaveProperty('programLevels');
    });

    it('should not persist orphaned fields when creating an Admin', async () => {
      // First create a User (required by DCV-002-005)
      const userId = new mongoose.Types.ObjectId();
      await User.create({
        _id: userId,
        email: 'admin@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['global-admin'],
        primaryRole: 'global-admin',
        status: 'active',
      });

      const programId = new mongoose.Types.ObjectId();
      const courseId = new mongoose.Types.ObjectId();

      const admin = await Admin.create({
        _id: userId,
        name: { first: 'Test', last: 'Admin' },
        email: 'admin@test.com',
        programs: [programId],
        courses: [courseId],
        instructors: [new mongoose.Types.ObjectId()],
        learners: [new mongoose.Types.ObjectId()],
      } as any);

      const found = await Admin.findById(admin._id).lean();
      expect(found).not.toHaveProperty('programs');
      expect(found).not.toHaveProperty('courses');
      expect(found).not.toHaveProperty('instructors');
      expect(found).not.toHaveProperty('learners');
    });
  });

  describe('Essential fields preserved', () => {
    it('Program should still have essential fields', () => {
      const schemaObj = Program.schema.obj;
      expect(schemaObj).toHaveProperty('name');
      expect(schemaObj).toHaveProperty('description');
      expect(schemaObj).toHaveProperty('duration');
      expect(schemaObj).toHaveProperty('code');
      expect(schemaObj).toHaveProperty('createdBy');
      expect(schemaObj).toHaveProperty('department');
      expect(schemaObj).toHaveProperty('archived');
    });

    it('Admin should still have essential fields', () => {
      const schemaObj = Admin.schema.obj;
      expect(schemaObj).toHaveProperty('name');
      expect(schemaObj).toHaveProperty('email');
      expect(schemaObj).toHaveProperty('department');
      expect(schemaObj).toHaveProperty('addresses');
      expect(schemaObj).toHaveProperty('honor');
    });
  });
});
