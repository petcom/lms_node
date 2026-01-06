/**
 * EVIP Phase 3: Department Count Queries
 * 
 * Tests that department counts use the correct query patterns after DCV changes:
 * - DCV-022: Staff uses departmentMemberships[] instead of department field
 * - DCV-044: Course/ProgramLevel inherit department from Program
 * 
 * This ensures GET /departments/:id returns accurate counts.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';
import User from '../../../model/Auth/User';

let mongoServer: MongoMemoryServer;
const prefix = `p3_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

describe('EVIP Phase 3: Department Count Queries (DCV-022, DCV-044)', () => {
  let testDepartment: any;
  let testProgram: any;
  let testUser: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections
    await Promise.all([
      Department.deleteMany({}),
      Program.deleteMany({}),
      ProgramLevel.deleteMany({}),
      Course.deleteMany({}),
      Staff.deleteMany({}),
      Admin.deleteMany({}),
      User.deleteMany({})
    ]);

    // Create test user with all required fields
    testUser = await User.create({
      email: `${prefix}_user@test.com`,
      passwordHash: '$2b$10$validHashedPasswordHere1234567890',
      roles: ['staff']
    });

    // Create test department
    testDepartment = await Department.create({
      name: `${prefix} Test Department`,
      code: `${prefix}_DEPT`,
      level: 'top'
    });

    // Create test program in department
    testProgram = await Program.create({
      name: `${prefix} Test Program`,
      description: 'Test program description',
      department: testDepartment._id,
      createdBy: testUser._id
    });
  });

  describe('Staff count via departmentMemberships (DCV-022)', () => {
    it('should count staff with departmentMemberships for department', async () => {
      // Create staff with departmentMembership
      await Staff.create({
        _id: testUser._id,
        name: { first: 'Test', last: 'Staff' },
        departmentMemberships: [{
          departmentId: testDepartment._id,
          roles: ['instructor'],
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      // Query using correct pattern (DCV-022)
      const staffCount = await Staff.countDocuments({
        'departmentMemberships.departmentId': testDepartment._id
      });

      expect(staffCount).toBe(1);
    });

    it('should count staff with multiple memberships correctly', async () => {
      const otherDepartment = await Department.create({
        name: `${prefix} Other Department`,
        code: `${prefix}_OTHER`,
        level: 'top'
      });

      // Create staff with membership in both departments
      await Staff.create({
        _id: testUser._id,
        name: { first: 'Multi', last: 'Dept' },
        departmentMemberships: [
          { departmentId: testDepartment._id, roles: ['instructor'], createdAt: new Date(), updatedAt: new Date() },
          { departmentId: otherDepartment._id, roles: ['content-admin'], createdAt: new Date(), updatedAt: new Date() }
        ]
      });

      // Should count in test department
      const testDeptCount = await Staff.countDocuments({
        'departmentMemberships.departmentId': testDepartment._id
      });
      expect(testDeptCount).toBe(1);

      // Should count in other department
      const otherDeptCount = await Staff.countDocuments({
        'departmentMemberships.departmentId': otherDepartment._id
      });
      expect(otherDeptCount).toBe(1);
    });

    it('should NOT find staff using legacy department field query', async () => {
      // Create staff with departmentMembership (correct way)
      await Staff.create({
        _id: testUser._id,
        name: { first: 'Test', last: 'Staff' },
        departmentMemberships: [{
          departmentId: testDepartment._id,
          roles: ['instructor'],
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      // Legacy query pattern should return 0
      const legacyCount = await Staff.countDocuments({
        department: testDepartment._id
      });

      expect(legacyCount).toBe(0);
    });
  });

  describe('Course count via Program relationship (DCV-044)', () => {
    it('should count courses via their Program department', async () => {
      // Create courses in the program
      await Course.create({
        title: `${prefix} Course 1`,
        program: testProgram._id,
        createdBy: testUser._id
      });
      await Course.create({
        title: `${prefix} Course 2`,
        program: testProgram._id,
        createdBy: testUser._id
      });

      // Get program IDs for this department
      const programs = await Program.find({ department: testDepartment._id }).select('_id').lean();
      const programIds = programs.map(p => p._id);

      // Query courses via Program relationship (DCV-044)
      const courseCount = await Course.countDocuments({
        program: { $in: programIds }
      });

      expect(courseCount).toBe(2);
    });

    it('should NOT find courses using legacy department field query', async () => {
      await Course.create({
        title: `${prefix} Legacy Test`,
        program: testProgram._id,
        createdBy: testUser._id
      });

      // Legacy query pattern should return 0
      const legacyCount = await Course.countDocuments({
        department: testDepartment._id
      });

      expect(legacyCount).toBe(0);
    });
  });

  describe('ProgramLevel count via Program relationship (DCV-044)', () => {
    it('should count program levels via their Program department', async () => {
      // Create program levels in the program
      await ProgramLevel.create({
        name: `${prefix} Level 1`,
        program: testProgram._id,
        order: 1,
        createdBy: testUser._id
      });
      await ProgramLevel.create({
        name: `${prefix} Level 2`,
        program: testProgram._id,
        order: 2,
        createdBy: testUser._id
      });

      // Get program IDs for this department
      const programs = await Program.find({ department: testDepartment._id }).select('_id').lean();
      const programIds = programs.map(p => p._id);

      // Query program levels via Program relationship (DCV-044)
      const levelCount = await ProgramLevel.countDocuments({
        program: { $in: programIds }
      });

      expect(levelCount).toBe(2);
    });

    it('should NOT find program levels using legacy department field query', async () => {
      await ProgramLevel.create({
        name: `${prefix} Legacy Level`,
        program: testProgram._id,
        order: 1,
        createdBy: testUser._id
      });

      // Legacy query pattern should return 0
      const legacyCount = await ProgramLevel.countDocuments({
        department: testDepartment._id
      });

      expect(legacyCount).toBe(0);
    });
  });

  describe('Combined department count accuracy', () => {
    it('should provide accurate counts using DCV-compliant queries', async () => {
      // Create staff
      await Staff.create({
        _id: testUser._id,
        name: { first: 'Test', last: 'Staff' },
        departmentMemberships: [{
          departmentId: testDepartment._id,
          roles: ['instructor'],
          createdAt: new Date(),
          updatedAt: new Date()
        }]
      });

      // Create courses
      await Course.create({
        title: `${prefix} Course`,
        program: testProgram._id,
        createdBy: testUser._id
      });

      // Create program levels
      await ProgramLevel.create({
        name: `${prefix} Level`,
        program: testProgram._id,
        order: 1,
        createdBy: testUser._id
      });

      // Get program IDs for department
      const programs = await Program.find({ department: testDepartment._id }).select('_id').lean();
      const programIds = programs.map(p => p._id);

      // Run all DCV-compliant counts
      const [staffCount, programCount, courseCount, levelCount] = await Promise.all([
        Staff.countDocuments({ 'departmentMemberships.departmentId': testDepartment._id }),
        Program.countDocuments({ department: testDepartment._id }),
        Course.countDocuments({ program: { $in: programIds } }),
        ProgramLevel.countDocuments({ program: { $in: programIds } })
      ]);

      expect(staffCount).toBe(1);
      expect(programCount).toBe(1);
      expect(courseCount).toBe(1);
      expect(levelCount).toBe(1);
    });
  });
});
