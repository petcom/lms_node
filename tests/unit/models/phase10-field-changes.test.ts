/**
 * Phase 10 Field Changes Tests
 * DCV-040: Replace Staff.isWithdrawn/isSuspended with status enum
 * DCV-042: Add Department.status enum ['active', 'archived']
 * DCV-043: Remove Program.duration - tracked at Class level
 * DCV-045: Add CourseContent segment title field
 * DCV-046: Remove 'scorm' from CustomContent.customType enum
 * DCV-047: Add CustomContent.questions ref for quiz/exam types
 * DCV-048: Add RenderedCourse.css and RenderedCourse.version
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Staff from '../../../model/Staff/Staff';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import CourseContent from '../../../model/Academic/CourseContent';
import CustomContent from '../../../model/Content/CustomContent';
import RenderedCourse from '../../../model/Content/RenderedCourse';
import Course from '../../../model/Content/Course';
import User from '../../../model/Auth/User';
import Admin from '../../../model/Staff/Admin';

describe('Phase 10 Field Changes', () => {
  let mongoServer: MongoMemoryServer;
  let department: any;
  let program: any;
  let course: any;
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
    
    course = await Course.create({
      title: 'Test Course',
      shortDescription: 'Short desc',
      program: program._id,
      createdBy: adminUser._id,
    });
  });

  describe('DCV-040: Staff status enum', () => {
    it('should have status field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).toHaveProperty('status');
    });

    it('should NOT have isWithdrawn field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).not.toHaveProperty('isWithdrawn');
    });

    it('should NOT have isSuspended field in Staff schema', () => {
      const schemaObj = Staff.schema.obj;
      expect(schemaObj).not.toHaveProperty('isSuspended');
    });

    it('should default status to active', async () => {
      const staff = await Staff.create({
        _id: adminUser._id,
        name: { first: 'Test', last: 'Staff' },
      });
      expect(staff.status).toBe('active');
    });

    it('should accept valid status values', async () => {
      const staff = await Staff.create({
        _id: adminUser._id,
        name: { first: 'Test', last: 'Staff' },
        status: 'suspended',
      });
      expect(staff.status).toBe('suspended');
    });
  });

  describe('DCV-042: Department status', () => {
    it('should have status field in Department schema', () => {
      const schemaObj = Department.schema.obj;
      expect(schemaObj).toHaveProperty('status');
    });

    it('should default status to active', async () => {
      const dept = await Department.create({
        name: 'New Dept',
        code: 'NEW',
        level: 'sub',
        parent: department._id,
      });
      expect(dept.status).toBe('active');
    });

    it('should allow archived status', async () => {
      const dept = await Department.create({
        name: 'Archived Dept',
        code: 'ARC',
        level: 'sub',
        parent: department._id,
        status: 'archived',
      });
      expect(dept.status).toBe('archived');
    });
  });

  describe('DCV-043: Program duration removed', () => {
    it('should NOT have duration field in Program schema', () => {
      const schemaObj = Program.schema.obj;
      expect(schemaObj).not.toHaveProperty('duration');
    });

    it('should create Program without duration', async () => {
      const newProgram = await Program.create({
        name: 'Duration Test',
        description: 'Test',
        createdBy: adminUser._id,
        department: department._id,
      });
      expect((newProgram as any).duration).toBeUndefined();
    });
  });

  describe('DCV-045: CourseContent title field', () => {
    it('should have title field in CourseContent schema', () => {
      const schemaObj = CourseContent.schema.obj;
      expect(schemaObj).toHaveProperty('title');
    });

    it('should save CourseContent with title', async () => {
      const customContent = await CustomContent.create({
        title: 'Test Custom',
        customType: 'custom',
        createdBy: adminUser._id,
      });
      
      const content = await CourseContent.create({
        course: course._id,
        title: 'Introduction Module',
        contentType: 'custom',
        customContentId: customContent._id,
        order: 1,
        createdBy: adminUser._id,
      });
      expect(content.title).toBe('Introduction Module');
    });
  });

  describe('DCV-046: CustomContent.customType without scorm', () => {
    it('should NOT allow scorm as customType', async () => {
      await expect(
        CustomContent.create({
          title: 'SCORM Test',
          customType: 'scorm',
          createdBy: adminUser._id,
        })
      ).rejects.toThrow(/`scorm` is not a valid enum value/);
    });

    it('should allow valid customType values', async () => {
      const content = await CustomContent.create({
        title: 'Quiz Test',
        customType: 'quiz',
        createdBy: adminUser._id,
      });
      expect(content.customType).toBe('quiz');
    });
  });

  describe('DCV-047: CustomContent questions ref', () => {
    it('should have questions field in CustomContent schema', () => {
      const schemaObj = CustomContent.schema.obj;
      expect(schemaObj).toHaveProperty('questions');
    });
  });

  describe('DCV-048: RenderedCourse css and version', () => {
    it('should have css field in RenderedCourse schema', () => {
      const schemaObj = RenderedCourse.schema.obj;
      expect(schemaObj).toHaveProperty('css');
    });

    it('should have version field in RenderedCourse schema', () => {
      const schemaObj = RenderedCourse.schema.obj;
      expect(schemaObj).toHaveProperty('version');
    });

    it('should save RenderedCourse with css and version', async () => {
      const rendered = await RenderedCourse.create({
        courseId: course._id,
        contentVersion: new Date(),
        html: '<div>Test</div>',
        css: '.test { color: red; }',
        version: 1,
      });
      expect(rendered.css).toBe('.test { color: red; }');
      expect(rendered.version).toBe(1);
    });

    it('should default version to 1', async () => {
      const rendered = await RenderedCourse.create({
        courseId: course._id,
        contentVersion: new Date(),
        html: '<div>Test</div>',
      });
      expect(rendered.version).toBe(1);
    });
  });
});
