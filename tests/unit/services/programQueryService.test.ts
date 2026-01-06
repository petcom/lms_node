/**
 * Program Query Service Tests
 * DCV-017: Test cached query service for program aggregations
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ProgramQueryService } from '../../../services/programQueryService';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import ProgramEnrollment from '../../../model/Academic/ProgramEnrollment';
import Course from '../../../model/Content/Course';
import Staff from '../../../model/Staff/Staff';
import Learner from '../../../model/Academic/Learner';
import User from '../../../model/Auth/User';
import Department from '../../../model/Academic/Department';

describe('ProgramQueryService (DCV-017)', () => {
  let mongoServer: MongoMemoryServer;
  let service: ProgramQueryService;
  let program: any;
  let programLevel: any;
  let department: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    service = new ProgramQueryService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
    
    // Create department
    department = await Department.create({
      name: 'Test Department',
      code: 'TEST',
      level: 'top',
    });

    // Create a program
    program = await Program.create({
      name: 'Computer Science',
      description: 'CS Program',
      createdBy: new mongoose.Types.ObjectId(),
      department: department._id,
    });

    // Create program level
    programLevel = await ProgramLevel.create({
      program: program._id,
      name: 'Year 1',
      order: 1,
      createdBy: new mongoose.Types.ObjectId(),
      department: department._id,
    });
  });

  describe('getLearners', () => {
    it('should return learners enrolled in a program', async () => {
      // Create user and learner
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
        email: 'learner@test.com',
        globalStatus: 'active',
      });

      // Create enrollment (DCV-026: status changed from 'active' to 'enrolled')
      await ProgramEnrollment.create({
        learner: learner._id,
        program: program._id,
        status: 'enrolled',
        enrolledAt: new Date(),
      });

      const learners = await service.getLearners(program._id.toString());
      
      expect(learners).toHaveLength(1);
      expect(learners[0]._id.toString()).toBe(learner._id.toString());
    });

    it('should only return active enrollments', async () => {
      // Create active learner
      const activeUser = await User.create({
        email: 'active@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['learner'],
        primaryRole: 'learner',
        status: 'active',
      });
      
      const activeLearner = await Learner.create({
        _id: activeUser._id,
        name: { first: 'Active', last: 'Learner' },
        email: 'active@test.com',
        globalStatus: 'active',
      });

      // Create withdrawn learner
      const withdrawnUser = await User.create({
        email: 'withdrawn@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['learner'],
        primaryRole: 'learner',
        status: 'active',
      });
      
      const withdrawnLearner = await Learner.create({
        _id: withdrawnUser._id,
        name: { first: 'Withdrawn', last: 'Learner' },
        email: 'withdrawn@test.com',
        globalStatus: 'active',
      });

      // DCV-026: status changed from 'active' to 'enrolled'
      await ProgramEnrollment.create({
        learner: activeLearner._id,
        program: program._id,
        status: 'enrolled',
        enrolledAt: new Date(),
      });

      await ProgramEnrollment.create({
        learner: withdrawnLearner._id,
        program: program._id,
        status: 'withdrawn',
        enrolledAt: new Date(),
        withdrawnAt: new Date(),
      });

      const learners = await service.getLearners(program._id.toString());
      
      expect(learners).toHaveLength(1);
      expect(learners[0]._id.toString()).toBe(activeLearner._id.toString());
    });

    it('should return empty array for program with no enrollments', async () => {
      const learners = await service.getLearners(program._id.toString());
      expect(learners).toHaveLength(0);
    });
  });

  describe('getInstructors', () => {
    it('should return instructors from courses in program levels', async () => {
      // Create user and staff
      const user = await User.create({
        email: 'instructor@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['staff'],
        primaryRole: 'staff',
        staffRoles: ['instructor'],
        status: 'active',
      });
      
      const instructor = await Staff.create({
        _id: user._id,
        name: { first: 'Test', last: 'Instructor' },
        email: 'instructor@test.com',
        status: 'active',
        applicationStatus: 'approved',
      });

      // Create course with instructor
      await Course.create({
        title: 'Introduction to Programming',
        description: 'Intro course',
        programLevel: programLevel._id,
        program: program._id,
        primaryInstructors: [instructor._id],
        department: department._id,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const instructors = await service.getInstructors(program._id.toString());
      
      expect(instructors).toHaveLength(1);
      expect(instructors[0]._id.toString()).toBe(instructor._id.toString());
    });

    it('should deduplicate instructors across multiple courses', async () => {
      // Create instructor
      const user = await User.create({
        email: 'instructor@test.com',
        passwordHash: '$2a$10$mockhashedpassword',
        roles: ['staff'],
        primaryRole: 'staff',
        staffRoles: ['instructor'],
        status: 'active',
      });
      
      const instructor = await Staff.create({
        _id: user._id,
        name: { first: 'Test', last: 'Instructor' },
        email: 'instructor@test.com',
        status: 'active',
        applicationStatus: 'approved',
      });

      // Create two courses with same instructor
      await Course.create({
        title: 'Course 1',
        description: 'Course 1',
        programLevel: programLevel._id,
        program: program._id,
        primaryInstructors: [instructor._id],
        department: department._id,
        createdBy: new mongoose.Types.ObjectId(),
      });

      await Course.create({
        title: 'Course 2',
        description: 'Course 2',
        programLevel: programLevel._id,
        program: program._id,
        primaryInstructors: [instructor._id],
        department: department._id,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const instructors = await service.getInstructors(program._id.toString());
      
      // Should only return 1 instructor (deduplicated)
      expect(instructors).toHaveLength(1);
    });

    it('should return empty array for program with no courses', async () => {
      const instructors = await service.getInstructors(program._id.toString());
      expect(instructors).toHaveLength(0);
    });
  });

  describe('getCourses', () => {
    it('should return courses from all program levels', async () => {
      await Course.create({
        title: 'Course 1',
        description: 'Course 1',
        programLevel: programLevel._id,
        program: program._id,
        department: department._id,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const courses = await service.getCourses(program._id.toString());
      
      expect(courses).toHaveLength(1);
      expect(courses[0].title).toBe('Course 1');
    });

    it('should return courses from multiple program levels', async () => {
      const programLevel2 = await ProgramLevel.create({
        program: program._id,
        name: 'Year 2',
        order: 2,
        createdBy: new mongoose.Types.ObjectId(),
        department: department._id,
      });

      await Course.create({
        title: 'Course 1',
        description: 'Year 1 course',
        programLevel: programLevel._id,
        program: program._id,
        department: department._id,
        createdBy: new mongoose.Types.ObjectId(),
      });

      await Course.create({
        title: 'Course 2',
        description: 'Year 2 course',
        programLevel: programLevel2._id,
        program: program._id,
        department: department._id,
        createdBy: new mongoose.Types.ObjectId(),
      });

      const courses = await service.getCourses(program._id.toString());
      
      expect(courses).toHaveLength(2);
    });
  });

  describe('invalidateCache', () => {
    it('should be idempotent (safe to call even without cache)', async () => {
      // Should not throw
      await expect(
        service.invalidateCache(program._id.toString())
      ).resolves.not.toThrow();
    });
  });
});
