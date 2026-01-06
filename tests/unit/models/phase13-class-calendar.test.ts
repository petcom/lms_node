/**
 * Phase 13 Tests: Class model Calendar integration
 * 
 * DCV-024: Document Class model definition and Calendar integration
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let Class: mongoose.Model<any>;
let AcademicYear: mongoose.Model<any>;
let AcademicTerm: mongoose.Model<any>;
let Program: mongoose.Model<any>;
let ProgramLevel: mongoose.Model<any>;
let Department: mongoose.Model<any>;
let User: mongoose.Model<any>;

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // Import models after connection
  Class = (await import('../../../model/Academic/Class')).default;
  AcademicYear = (await import('../../../model/Academic/AcademicYear')).default;
  AcademicTerm = (await import('../../../model/Academic/AcademicTerm')).default;
  Program = (await import('../../../model/Academic/Program')).default;
  ProgramLevel = (await import('../../../model/Academic/ProgramLevel')).default;
  Department = (await import('../../../model/Academic/Department')).default;
  User = (await import('../../../model/Auth/User')).default;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('DCV-024: Class Model Calendar Integration', () => {
  let userId: mongoose.Types.ObjectId;
  let departmentId: mongoose.Types.ObjectId;
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let academicYearId: mongoose.Types.ObjectId;
  let academicTermId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create User
    const user = await User.create({
      email: 'creator@test.com',
      passwordHash: 'hashedpassword123',
      roles: ['staff'],
      primaryRole: 'staff',
    });
    userId = user._id;

    // Create Department
    const department = await Department.create({
      name: 'Test Department',
      code: 'TD',
      level: 'top',
    });
    departmentId = department._id;

    // Create Program
    const program = await Program.create({
      name: 'Test Program',
      description: 'Test program description',
      department: departmentId,
      createdBy: userId,
    });
    programId = program._id;

    // Create ProgramLevel
    const programLevel = await ProgramLevel.create({
      name: 'Level 1',
      order: 1,
      program: programId,
      createdBy: userId,
    });
    programLevelId = programLevel._id;

    // Create AcademicYear
    const academicYear = await AcademicYear.create({
      name: '2024-2025',
      fromYear: new Date('2024-09-01'),
      toYear: new Date('2025-06-30'),
      createdBy: userId,
    });
    academicYearId = academicYear._id;

    // Create AcademicTerm
    const academicTerm = await AcademicTerm.create({
      name: 'Fall 2024',
      description: 'Fall semester 2024',
      academicYear: academicYearId,
      createdBy: userId,
    });
    academicTermId = academicTerm._id;
  });

  it('should have academicYear field in Class schema', async () => {
    const classDoc = await Class.create({
      name: 'Test Class',
      program: programId,
      programLevel: programLevelId,
      academicYear: academicYearId,
      createdBy: userId,
    });

    expect(classDoc.academicYear).toBeDefined();
    expect(classDoc.academicYear.toString()).toBe(academicYearId.toString());
  });

  it('should have academicTerm field in Class schema', async () => {
    const classDoc = await Class.create({
      name: 'Test Class',
      program: programId,
      programLevel: programLevelId,
      academicYear: academicYearId,
      academicTerm: academicTermId,
      createdBy: userId,
    });

    expect(classDoc.academicTerm).toBeDefined();
    expect(classDoc.academicTerm.toString()).toBe(academicTermId.toString());
  });

  it('should have duration field (moved from Program per DCV-043)', async () => {
    const classDoc = await Class.create({
      name: 'Test Class',
      program: programId,
      programLevel: programLevelId,
      duration: '12 weeks',
      createdBy: userId,
    });

    expect(classDoc.duration).toBe('12 weeks');
  });

  it('should populate academicYear and academicTerm', async () => {
    const classDoc = await Class.create({
      name: 'Test Class',
      program: programId,
      programLevel: programLevelId,
      academicYear: academicYearId,
      academicTerm: academicTermId,
      createdBy: userId,
    });

    const populated = await Class.findById(classDoc._id)
      .populate('academicYear')
      .populate('academicTerm');

    expect(populated.academicYear.name).toBe('2024-2025');
    expect(populated.academicTerm.name).toBe('Fall 2024');
  });

  it('createdBy should reference User (DCV-053)', async () => {
    const classDoc = await Class.create({
      name: 'Test Class',
      program: programId,
      programLevel: programLevelId,
      createdBy: userId,
    });

    const populated = await Class.findById(classDoc._id).populate('createdBy');
    expect(populated.createdBy._id.toString()).toBe(userId.toString());
  });
});
