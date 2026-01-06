/**
 * Grading Policy Tests (Phase 9)
 * DCV-033: Add gradingPolicy + maxAttempts to Exam model
 * DCV-034: Add gradingPolicy to ScormPackage model
 * DCV-035: Add defaultGradingPolicy to Course model
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Exam from '../../../model/Academic/Exam';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Course from '../../../model/Content/Course';
import User from '../../../model/Auth/User';
import Admin from '../../../model/Staff/Admin';
import Program from '../../../model/Academic/Program';
import AcademicTerm from '../../../model/Academic/AcademicTerm';
import AcademicYear from '../../../model/Academic/AcademicYear';
import Department from '../../../model/Academic/Department';

describe('Grading Policy Fields (DCV-033, DCV-034, DCV-035)', () => {
  let mongoServer: MongoMemoryServer;
  let department: any;
  let program: any;
  let course: any;
  let adminUser: any;
  let academicTerm: any;
  let academicYear: any;

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
      duration: '2 years',
      createdBy: adminUser._id,
      department: department._id,
    });
    
    academicYear = await AcademicYear.create({
      name: '2024-2025',
      fromYear: new Date('2024-09-01'),
      toYear: new Date('2025-08-31'),
      isCurrent: true,
      createdBy: adminUser._id,
    });
    
    academicTerm = await AcademicTerm.create({
      name: 'Fall 2024',
      description: 'Fall term',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-31'),
      createdBy: adminUser._id,
      academicYear: academicYear._id,
    });
    
    course = await Course.create({
      title: 'Test Course',
      shortDescription: 'Short desc',
      program: program._id,
      createdBy: adminUser._id,
    });
  });

  describe('DCV-033: Exam gradingPolicy and maxAttempts', () => {
    it('should have gradingPolicy field in Exam schema', () => {
      const schemaObj = Exam.schema.obj;
      expect(schemaObj).toHaveProperty('gradingPolicy');
    });

    it('should have maxAttempts field in Exam schema', () => {
      const schemaObj = Exam.schema.obj;
      expect(schemaObj).toHaveProperty('maxAttempts');
    });

    it('should default gradingPolicy.type to final-attempt', async () => {
      const exam = await Exam.create({
        name: 'Test Exam',
        description: 'Test description',
        course: course._id,
        program: program._id,
        passMark: 70,
        totalMark: 100,
        academicTerm: academicTerm._id,
        academicYear: academicYear._id,
        duration: '60 minutes',
        examDate: new Date(),
        examTime: '10:00 AM',
        examType: 'exam',
        createdBy: adminUser._id,
      });

      expect(exam.gradingPolicy?.type).toBe('final-attempt');
    });

    it('should allow setting gradingPolicy to best-attempt', async () => {
      const exam = await Exam.create({
        name: 'Test Exam',
        description: 'Test description',
        course: course._id,
        program: program._id,
        passMark: 70,
        totalMark: 100,
        academicTerm: academicTerm._id,
        academicYear: academicYear._id,
        duration: '60 minutes',
        examDate: new Date(),
        examTime: '10:00 AM',
        examType: 'exam',
        createdBy: adminUser._id,
        gradingPolicy: { type: 'best-attempt' },
        maxAttempts: 3,
      });

      expect(exam.gradingPolicy?.type).toBe('best-attempt');
      expect(exam.maxAttempts).toBe(3);
    });

    it('should allow null maxAttempts for unlimited attempts', async () => {
      const exam = await Exam.create({
        name: 'Test Exam',
        description: 'Test description',
        course: course._id,
        program: program._id,
        passMark: 70,
        totalMark: 100,
        academicTerm: academicTerm._id,
        academicYear: academicYear._id,
        duration: '60 minutes',
        examDate: new Date(),
        examTime: '10:00 AM',
        examType: 'exam',
        createdBy: adminUser._id,
        maxAttempts: null,
      });

      expect(exam.maxAttempts).toBeNull();
    });
  });

  describe('DCV-034: ScormPackage gradingPolicy', () => {
    it('should have gradingPolicy field in ScormPackage schema', () => {
      const schemaObj = ScormPackage.schema.obj;
      expect(schemaObj).toHaveProperty('gradingPolicy');
    });

    it('should have maxAttempts field in ScormPackage schema', () => {
      const schemaObj = ScormPackage.schema.obj;
      expect(schemaObj).toHaveProperty('maxAttempts');
    });

    it('should default gradingPolicy.type to final-attempt', async () => {
      const pkg = await ScormPackage.create({
        packageId: 'test-pkg-001',
        title: 'Test SCORM Package',
        version: 'scorm_2004',
        fileName: 'test.zip',
        fileSize: 1024,
        filePath: '/path/to/test.zip',
        manifestData: {
          identifier: 'test-manifest',
          version: 'scorm_2004',
        },
        launchUrl: '/scorm/test-pkg-001/index.html',
        entryPoint: 'index.html',
        department: department._id,
        createdBy: adminUser._id,
      });

      expect(pkg.gradingPolicy?.type).toBe('final-attempt');
    });
  });

  describe('DCV-035: Course defaultGradingPolicy', () => {
    it('should have defaultGradingPolicy field in Course schema', () => {
      const schemaObj = Course.schema.obj;
      expect(schemaObj).toHaveProperty('defaultGradingPolicy');
    });

    it('should default defaultGradingPolicy.type to final-attempt', async () => {
      const newCourse = await Course.create({
        title: 'Policy Test Course',
        shortDescription: 'Test',
        program: program._id,
        createdBy: adminUser._id,
      });

      expect(newCourse.defaultGradingPolicy?.type).toBe('final-attempt');
    });

    it('should allow course to set average-all policy', async () => {
      const newCourse = await Course.create({
        title: 'Average Policy Course',
        shortDescription: 'Test',
        program: program._id,
        createdBy: adminUser._id,
        defaultGradingPolicy: { type: 'average-all' },
      });

      expect(newCourse.defaultGradingPolicy?.type).toBe('average-all');
    });
  });
});
