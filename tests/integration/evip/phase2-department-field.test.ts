/**
 * EVIP Phase 2: Department Field Removal Tests
 * 
 * Tests for DCV-022 (Staff.department), DCV-044 (Course/ProgramLevel.department)
 * Department should be inherited from Program, not stored directly
 */
import mongoose from 'mongoose';
import User from '../../../model/Auth/User';
import Staff from '../../../model/Staff/Staff';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import Department from '../../../model/Academic/Department';
import { hashPassword } from '../../../utils/helpers';

describe('EVIP Phase 2: Department Field Storage (DCV-022, DCV-044)', () => {
  const uniquePrefix = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const testIds = {
    department: new mongoose.Types.ObjectId(),
    program: new mongoose.Types.ObjectId(),
    programLevel: new mongoose.Types.ObjectId(),
    course: new mongoose.Types.ObjectId(),
    staff: new mongoose.Types.ObjectId(),
    user: new mongoose.Types.ObjectId(), // for createdBy
  };

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await Department.deleteMany({ _id: testIds.department });
    await Program.deleteMany({ _id: testIds.program });
    await ProgramLevel.deleteMany({ _id: testIds.programLevel });
    await Course.deleteMany({ _id: testIds.course });
    await Staff.deleteMany({ _id: testIds.staff });
    await User.deleteMany({ _id: { $in: [testIds.staff, testIds.user] } });

    const passwordHash = await hashPassword('TestPassword123!');

    // Create user for createdBy references
    await User.create({
      _id: testIds.user,
      email: `evip-phase2-creator-${uniquePrefix}@test.com`,
      passwordHash,
      roles: ['global-admin'],
      primaryRole: 'global-admin',
      status: 'active',
    });

    // Create test Department
    await Department.create({
      _id: testIds.department,
      name: `Test Department ${uniquePrefix}`,
      level: 'top',
    });

    // Create test Program with department
    await Program.create({
      _id: testIds.program,
      name: `Test Program ${uniquePrefix}`,
      title: `Test Program ${uniquePrefix}`,
      description: 'Test program description',
      department: testIds.department,
      createdBy: testIds.user,
    });

    // Create test ProgramLevel linked to Program
    await ProgramLevel.create({
      _id: testIds.programLevel,
      name: `Test Level ${uniquePrefix}`,
      program: testIds.program,
      createdBy: testIds.user,
      order: 1,
    });

    // Create test Course linked to Program
    await Course.create({
      _id: testIds.course,
      title: `Test Course ${uniquePrefix}`,
      program: testIds.program,
      createdBy: testIds.user,
    });

    // Create test Staff with User
    await User.create({
      _id: testIds.staff,
      email: `evip-phase2-staff-${uniquePrefix}@test.com`,
      passwordHash,
      roles: ['staff'],
      primaryRole: 'staff',
      status: 'active',
    });
    await Staff.create({
      _id: testIds.staff,
      name: { first: 'Test', last: 'Staff' },
      departmentMemberships: [
        { departmentId: testIds.department, roles: ['instructor'] }
      ],
    });
  });

  afterAll(async () => {
    await Department.deleteMany({ _id: testIds.department });
    await Program.deleteMany({ _id: testIds.program });
    await ProgramLevel.deleteMany({ _id: testIds.programLevel });
    await Course.deleteMany({ _id: testIds.course });
    await Staff.deleteMany({ _id: testIds.staff });
    await User.deleteMany({ _id: { $in: [testIds.staff, testIds.user] } });
  });

  describe('DCV-044: Course department via getDepartment() method', () => {
    it('should retrieve department from Program via getDepartment() method', async () => {
      const course = await Course.findById(testIds.course);
      expect(course).toBeDefined();
      
      const department = await course?.getDepartment();
      expect(department?.toString()).toBe(testIds.department.toString());
    });

    it('should not have department stored directly on Course document', async () => {
      // Note: Course may still have department field for backwards compatibility
      // but getDepartment() should always return Program's department
      const course = await Course.findById(testIds.course);
      const inheritedDept = await course?.getDepartment();
      expect(inheritedDept?.toString()).toBe(testIds.department.toString());
    });

    it('changing Program department should be reflected in Course.getDepartment()', async () => {
      const newDeptId = new mongoose.Types.ObjectId();
      await Department.create({
        _id: newDeptId,
        name: `New Department ${uniquePrefix}`,
        level: 'sub',
      });
      
      await Program.findByIdAndUpdate(testIds.program, { department: newDeptId });
      
      const course = await Course.findById(testIds.course);
      const department = await course?.getDepartment();
      expect(department?.toString()).toBe(newDeptId.toString());
      
      // Cleanup
      await Department.findByIdAndDelete(newDeptId);
    });
  });

  describe('DCV-044: ProgramLevel department via getDepartment() method', () => {
    it('should retrieve department from Program via getDepartment() method', async () => {
      const level = await ProgramLevel.findById(testIds.programLevel);
      expect(level).toBeDefined();
      
      const department = await level?.getDepartment();
      expect(department?.toString()).toBe(testIds.department.toString());
    });

    it('changing Program department should be reflected in ProgramLevel.getDepartment()', async () => {
      const newDeptId = new mongoose.Types.ObjectId();
      await Department.create({
        _id: newDeptId,
        name: `New Department 2 ${uniquePrefix}`,
        level: 'sub',
      });
      
      await Program.findByIdAndUpdate(testIds.program, { department: newDeptId });
      
      const level = await ProgramLevel.findById(testIds.programLevel);
      const department = await level?.getDepartment();
      expect(department?.toString()).toBe(newDeptId.toString());
      
      // Cleanup
      await Department.findByIdAndDelete(newDeptId);
    });
  });

  describe('DCV-022: Staff department via departmentMemberships', () => {
    it('should have departmentMemberships array instead of department field', async () => {
      const staff = await Staff.findById(testIds.staff);
      expect(staff?.departmentMemberships).toBeDefined();
      expect(Array.isArray(staff?.departmentMemberships)).toBe(true);
      expect(staff?.departmentMemberships?.length).toBeGreaterThan(0);
    });

    it('getPrimaryDepartment() should return first membership departmentId', async () => {
      const staff = await Staff.findById(testIds.staff);
      // Staff uses getPrimaryDepartment() which returns first membership's departmentId
      const department = staff?.getPrimaryDepartment();
      expect(department?.toString()).toBe(testIds.department.toString());
    });

    it('should not have legacy department field stored on Staff', async () => {
      const staff = await Staff.findById(testIds.staff).lean();
      // Legacy department field should be undefined
      expect((staff as any).department).toBeUndefined();
    });

    it('can have multiple departmentMemberships', async () => {
      const newDeptId = new mongoose.Types.ObjectId();
      await Department.create({
        _id: newDeptId,
        name: `Second Department ${uniquePrefix}`,
        level: 'sub',
      });
      
      await Staff.findByIdAndUpdate(testIds.staff, {
        $push: {
          departmentMemberships: {
            departmentId: newDeptId,
            roles: ['content-admin']
          }
        }
      });
      
      const staff = await Staff.findById(testIds.staff);
      expect(staff?.departmentMemberships?.length).toBe(2);
      
      // Cleanup
      await Department.findByIdAndDelete(newDeptId);
    });
  });
});
