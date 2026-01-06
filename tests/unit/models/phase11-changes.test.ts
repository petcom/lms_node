/**
 * Phase 11 Tests
 * DCV-044: Remove ProgramLevel.department and Course.department - inherit from Program
 * DCV-050: Add Settings.features with scope inheritance
 * DCV-051: Create Media model for external hosted content
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import Program from '../../../model/Academic/Program';
import Department from '../../../model/Academic/Department';
import User from '../../../model/Auth/User';
import Admin from '../../../model/Staff/Admin';
import Settings from '../../../model/System/Settings';

describe('Phase 11 Changes', () => {
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

  describe('DCV-044: Inherited department fields', () => {
    it('ProgramLevel should NOT have department field in schema', () => {
      const schemaObj = ProgramLevel.schema.obj;
      expect(schemaObj).not.toHaveProperty('department');
    });

    it('Course should NOT have department field in schema', () => {
      const schemaObj = Course.schema.obj;
      expect(schemaObj).not.toHaveProperty('department');
    });

    it('Course should have getDepartment method', async () => {
      const course = await Course.create({
        title: 'Test Course',
        shortDescription: 'Test',
        program: program._id,
        createdBy: adminUser._id,
      });
      
      expect(typeof course.getDepartment).toBe('function');
    });

    it('Course.getDepartment should return program department', async () => {
      const course = await Course.create({
        title: 'Test Course',
        shortDescription: 'Test',
        program: program._id,
        createdBy: adminUser._id,
      });
      
      const deptId = await course.getDepartment();
      expect(deptId?.toString()).toBe(department._id.toString());
    });

    it('ProgramLevel should have getDepartment method', async () => {
      const level = await ProgramLevel.create({
        name: 'Level 1',
        program: program._id,
        order: 1,
        createdBy: adminUser._id,
      });
      
      expect(typeof level.getDepartment).toBe('function');
    });

    it('ProgramLevel.getDepartment should return program department', async () => {
      const level = await ProgramLevel.create({
        name: 'Level 1',
        program: program._id,
        order: 1,
        createdBy: adminUser._id,
      });
      
      const deptId = await level.getDepartment();
      expect(deptId?.toString()).toBe(department._id.toString());
    });
  });

  describe('DCV-050: Settings.features', () => {
    it('Settings should have features field in schema', () => {
      const schemaObj = Settings.schema.obj;
      expect(schemaObj).toHaveProperty('features');
    });

    it('should store feature flags with scope', async () => {
      const settings = await Settings.create({
        scope: 'global',
        features: new Map([
          ['enableScormTracking', true],
          ['enableProgressReports', false],
        ]),
      });
      
      expect(settings.features?.get('enableScormTracking')).toBe(true);
      expect(settings.features?.get('enableProgressReports')).toBe(false);
    });
  });
});
