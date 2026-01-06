/**
 * Phase 12 Tests: New Models and createdBy Updates
 * 
 * DCV-031: Create Credential model (certificates/degrees)
 * DCV-051: Create Media model for external hosted content
 * DCV-053: Update all createdBy fields to ref:User
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Models will be imported after creation
let Credential: mongoose.Model<any>;
let Media: mongoose.Model<any>;
let Program: mongoose.Model<any>;
let Course: mongoose.Model<any>;
let ProgramLevel: mongoose.Model<any>;
let CourseContent: mongoose.Model<any>;
let CustomContent: mongoose.Model<any>;
let Exam: mongoose.Model<any>;
let Question: mongoose.Model<any>;
let ScormPackage: mongoose.Model<any>;
let User: mongoose.Model<any>;
let Department: mongoose.Model<any>;

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  
  // Import models after connection
  Credential = (await import('../../../model/Academic/Credential')).default;
  Media = (await import('../../../model/Content/Media')).default;
  Program = (await import('../../../model/Academic/Program')).default;
  Course = (await import('../../../model/Content/Course')).default;
  ProgramLevel = (await import('../../../model/Academic/ProgramLevel')).default;
  CourseContent = (await import('../../../model/Academic/CourseContent')).default;
  CustomContent = (await import('../../../model/Content/CustomContent')).default;
  Exam = (await import('../../../model/Academic/Exam')).default;
  Question = (await import('../../../model/Academic/Questions')).default;
  ScormPackage = (await import('../../../model/Scorm/ScormPackage')).default;
  User = (await import('../../../model/Auth/User')).default;
  Department = (await import('../../../model/Academic/Department')).default;
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

describe('DCV-031: Credential Model', () => {
  let userId: mongoose.Types.ObjectId;
  let departmentId: mongoose.Types.ObjectId;
  let programId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    
    // Create department with required level field
    const department = await Department.create({
      name: 'Test Department',
      code: 'TD',
      level: 'top',
    });
    departmentId = department._id;
    
    // Create program
    const program = await Program.create({
      name: 'Test Program',
      description: 'Test program description',
      department: departmentId,
      createdBy: userId,
    });
    programId = program._id;
  });

  it('should create a Credential with required fields', async () => {
    const credential = await Credential.create({
      name: 'Bachelor of Science',
      type: 'degree',
      program: programId,
      createdBy: userId,
    });

    expect(credential).toBeDefined();
    expect(credential.name).toBe('Bachelor of Science');
    expect(credential.type).toBe('degree');
    expect(credential.program.toString()).toBe(programId.toString());
    expect(credential.createdBy.toString()).toBe(userId.toString());
    expect(credential.status).toBe('draft'); // default
  });

  it('should support credential types: certificate, degree, diploma', async () => {
    const types = ['certificate', 'degree', 'diploma'];
    
    for (const type of types) {
      const credential = await Credential.create({
        name: `Test ${type}`,
        type,
        program: programId,
        createdBy: userId,
      });
      expect(credential.type).toBe(type);
    }
  });

  it('should support status: draft, active, archived', async () => {
    const statuses = ['draft', 'active', 'archived'];
    
    for (const status of statuses) {
      const credential = await Credential.create({
        name: `Credential ${status}`,
        type: 'certificate',
        program: programId,
        createdBy: userId,
        status,
      });
      expect(credential.status).toBe(status);
    }
  });

  it('should support optional requirements array', async () => {
    const credential = await Credential.create({
      name: 'Advanced Certificate',
      type: 'certificate',
      program: programId,
      createdBy: userId,
      requirements: [
        { description: 'Complete all core courses', minCredits: 30 },
        { description: 'Pass final exam', minScore: 70 },
      ],
    });

    expect(credential.requirements).toHaveLength(2);
    expect(credential.requirements[0].description).toBe('Complete all core courses');
    expect(credential.requirements[0].minCredits).toBe(30);
  });

  it('should require name, type, program, and createdBy', async () => {
    // Missing name
    await expect(Credential.create({
      type: 'certificate',
      program: programId,
      createdBy: userId,
    })).rejects.toThrow();

    // Missing type
    await expect(Credential.create({
      name: 'Test',
      program: programId,
      createdBy: userId,
    })).rejects.toThrow();

    // Missing program
    await expect(Credential.create({
      name: 'Test',
      type: 'certificate',
      createdBy: userId,
    })).rejects.toThrow();

    // Missing createdBy
    await expect(Credential.create({
      name: 'Test',
      type: 'certificate',
      program: programId,
    })).rejects.toThrow();
  });

  it('should have timestamps', async () => {
    const credential = await Credential.create({
      name: 'Test Credential',
      type: 'certificate',
      program: programId,
      createdBy: userId,
    });

    expect(credential.createdAt).toBeDefined();
    expect(credential.updatedAt).toBeDefined();
  });
});

describe('DCV-051: Media Model', () => {
  let userId: mongoose.Types.ObjectId;
  let departmentId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    
    // Create department with required level field
    const department = await Department.create({
      name: 'Test Department',
      code: 'TD2',
      level: 'top',
    });
    departmentId = department._id;
  });

  it('should create a Media with required fields', async () => {
    const media = await Media.create({
      name: 'Introduction Video',
      type: 'video',
      url: 'https://example.com/video.mp4',
      department: departmentId,
      createdBy: userId,
    });

    expect(media).toBeDefined();
    expect(media.name).toBe('Introduction Video');
    expect(media.type).toBe('video');
    expect(media.url).toBe('https://example.com/video.mp4');
    expect(media.department.toString()).toBe(departmentId.toString());
    expect(media.createdBy.toString()).toBe(userId.toString());
    expect(media.status).toBe('draft'); // default
  });

  it('should support media types: video, audio, document, image, embed', async () => {
    const types = ['video', 'audio', 'document', 'image', 'embed'];
    
    for (let i = 0; i < types.length; i++) {
      const media = await Media.create({
        name: `Test ${types[i]}`,
        type: types[i],
        url: `https://example.com/${types[i]}.mp4`,
        department: departmentId,
        createdBy: userId,
      });
      expect(media.type).toBe(types[i]);
    }
  });

  it('should support status: draft, published, archived', async () => {
    const statuses = ['draft', 'published', 'archived'];
    
    for (const status of statuses) {
      const media = await Media.create({
        name: `Media ${status}`,
        type: 'video',
        url: 'https://example.com/video.mp4',
        department: departmentId,
        createdBy: userId,
        status,
      });
      expect(media.status).toBe(status);
    }
  });

  it('should support optional metadata fields', async () => {
    const media = await Media.create({
      name: 'Detailed Video',
      type: 'video',
      url: 'https://example.com/video.mp4',
      department: departmentId,
      createdBy: userId,
      description: 'A detailed course introduction',
      durationSeconds: 3600,
      mimeType: 'video/mp4',
      fileSize: 104857600,
      thumbnailUrl: 'https://example.com/thumb.jpg',
    });

    expect(media.description).toBe('A detailed course introduction');
    expect(media.durationSeconds).toBe(3600);
    expect(media.mimeType).toBe('video/mp4');
    expect(media.fileSize).toBe(104857600);
    expect(media.thumbnailUrl).toBe('https://example.com/thumb.jpg');
  });

  it('should require name, type, url, department, and createdBy', async () => {
    // Missing name
    await expect(Media.create({
      type: 'video',
      url: 'https://example.com/video.mp4',
      department: departmentId,
      createdBy: userId,
    })).rejects.toThrow();

    // Missing type
    await expect(Media.create({
      name: 'Test',
      url: 'https://example.com/video.mp4',
      department: departmentId,
      createdBy: userId,
    })).rejects.toThrow();

    // Missing url
    await expect(Media.create({
      name: 'Test',
      type: 'video',
      department: departmentId,
      createdBy: userId,
    })).rejects.toThrow();

    // Missing department
    await expect(Media.create({
      name: 'Test',
      type: 'video',
      url: 'https://example.com/video.mp4',
      createdBy: userId,
    })).rejects.toThrow();

    // Missing createdBy
    await expect(Media.create({
      name: 'Test',
      type: 'video',
      url: 'https://example.com/video.mp4',
      department: departmentId,
    })).rejects.toThrow();
  });

  it('should have timestamps', async () => {
    const media = await Media.create({
      name: 'Test Media',
      type: 'video',
      url: 'https://example.com/video.mp4',
      department: departmentId,
      createdBy: userId,
    });

    expect(media.createdAt).toBeDefined();
    expect(media.updatedAt).toBeDefined();
  });
});

describe('DCV-053: createdBy references User', () => {
  let user: any;
  let departmentId: mongoose.Types.ObjectId;
  let programId: mongoose.Types.ObjectId;
  let programLevelId: mongoose.Types.ObjectId;
  let courseId: mongoose.Types.ObjectId;
  let academicYearId: mongoose.Types.ObjectId;
  let academicTermId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a real User to validate ref works
    user = await User.create({
      email: 'creator@test.com',
      passwordHash: 'hashedpassword123',
      roles: ['staff'],
      primaryRole: 'staff',
    });

    // Create department with required level field
    const department = await Department.create({
      name: 'Test Department',
      code: 'TD3',
      level: 'top',
    });
    departmentId = department._id;

    const program = await Program.create({
      name: 'Test Program',
      description: 'Test description',
      department: departmentId,
      createdBy: user._id,
    });
    programId = program._id;

    const programLevel = await ProgramLevel.create({
      name: 'Level 1',
      order: 1,
      program: programId,
      createdBy: user._id,
    });
    programLevelId = programLevel._id;

    // Create course for exam tests
    const course = await Course.create({
      title: 'Test Course',
      program: programId,
      programLevel: programLevelId,
      createdBy: user._id,
    });
    courseId = course._id;

    // Import AcademicYear and AcademicTerm for exam tests
    const AcademicYear = (await import('../../../model/Academic/AcademicYear')).default;
    const AcademicTerm = (await import('../../../model/Academic/AcademicTerm')).default;

    const academicYear = await AcademicYear.create({
      name: '2024-2025',
      fromYear: new Date('2024-09-01'),
      toYear: new Date('2025-06-30'),
      createdBy: user._id,
    });
    academicYearId = academicYear._id;

    const academicTerm = await AcademicTerm.create({
      name: 'Fall 2024',
      description: 'Fall semester 2024',
      academicYear: academicYearId,
      fromDate: new Date('2024-09-01'),
      toDate: new Date('2024-12-20'),
      createdBy: user._id,
    });
    academicTermId = academicTerm._id;
  });

  it('Program.createdBy should reference User', async () => {
    const program = await Program.findById(programId).populate('createdBy');
    expect(program.createdBy).toBeDefined();
    // With shared _id pattern, this works
    expect(program.createdBy._id.toString()).toBe(user._id.toString());
  });

  it('Course.createdBy should reference User', async () => {
    const course = await Course.create({
      title: 'Test Course',
      program: programId,
      programLevel: programLevelId,
      createdBy: user._id,
    });

    const found = await Course.findById(course._id).populate('createdBy');
    expect(found.createdBy._id.toString()).toBe(user._id.toString());
  });

  it('ProgramLevel.createdBy should reference User', async () => {
    const found = await ProgramLevel.findById(programLevelId).populate('createdBy');
    expect(found.createdBy._id.toString()).toBe(user._id.toString());
  });

  it('CourseContent.createdBy should reference User', async () => {
    const course = await Course.create({
      title: 'Test Course',
      program: programId,
      programLevel: programLevelId,
      createdBy: user._id,
    });

    const courseContent = await CourseContent.create({
      title: 'Test Content',
      order: 1,
      course: course._id,
      contentType: 'custom',
      createdBy: user._id,
    });

    const found = await CourseContent.findById(courseContent._id).populate('createdBy');
    expect(found.createdBy._id.toString()).toBe(user._id.toString());
  });

  it('CustomContent.createdBy should reference User', async () => {
    const customContent = await CustomContent.create({
      title: 'Test Custom Content',
      customType: 'exam',
      department: departmentId,
      createdBy: user._id,
    });

    const found = await CustomContent.findById(customContent._id).populate('createdBy');
    expect(found.createdBy._id.toString()).toBe(user._id.toString());
  });

  it('Exam.createdBy should reference User', async () => {
    const exam = await Exam.create({
      name: 'Test Exam',
      description: 'Test exam description',
      course: courseId,
      program: programId,
      academicTerm: academicTermId,
      academicYear: academicYearId,
      examTime: '10:00 AM',
      createdBy: user._id,
    });

    const found = await Exam.findById(exam._id).populate('createdBy');
    expect(found.createdBy._id.toString()).toBe(user._id.toString());
  });

  it('Question.createdBy should reference User', async () => {
    const question = await Question.create({
      question: 'What is 2+2?',
      optionA: '3',
      optionB: '4',
      optionC: '5',
      optionD: '6',
      correctAnswer: 'B',
      createdBy: user._id,
    });

    const found = await Question.findById(question._id).populate('createdBy');
    expect(found.createdBy._id.toString()).toBe(user._id.toString());
  });

  it('ScormPackage.createdBy should reference User', async () => {
    const scormPackage = await ScormPackage.create({
      packageId: 'pkg-001-test',
      title: 'Test Package',
      version: 'scorm_1.2',
      fileName: 'test-package.zip',
      fileSize: 1024000,
      filePath: '/path/to/package.zip',
      manifestData: {
        identifier: 'test-manifest',
        version: 'scorm_1.2',
      },
      entryPoint: 'index.html',
      launchUrl: '/scorm/pkg-001-test/index.html',
      department: departmentId,
      uploadedBy: user._id,
      createdBy: user._id,
    });

    const found = await ScormPackage.findById(scormPackage._id).populate('createdBy');
    expect(found.createdBy._id.toString()).toBe(user._id.toString());
  });

  it('Media.createdBy should reference User', async () => {
    const media = await Media.create({
      name: 'Test Media',
      type: 'video',
      url: 'https://example.com/video.mp4',
      department: departmentId,
      createdBy: user._id,
    });

    const found = await Media.findById(media._id).populate('createdBy');
    expect(found.createdBy._id.toString()).toBe(user._id.toString());
  });
});
