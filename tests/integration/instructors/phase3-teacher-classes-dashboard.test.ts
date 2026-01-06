import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ClassModel from '../../../model/Academic/Class';
import ClassEnrollment from '../../../model/Academic/ClassEnrollment';
import Learner from '../../../model/Academic/Learner';
import ContentAttempt from '../../../model/Academic/ContentAttempt';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';
import User from '../../../model/Auth/User';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import CourseContent from '../../../model/Academic/CourseContent';
import CourseEnrollment from '../../../model/Academic/CourseEnrollment';
import { hashPassword } from '../../../utils/helpers';

const instructorId = '0000000000000000000000b1';
const adminId = '0000000000000000000000a1';
const instructorToken = 'test-instructor-token';
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

const makePackage = (title: string, uploader?: string) => ({
  packageId: new mongoose.Types.ObjectId().toString(),
  title,
  description: `${title} desc`,
  version: 'scorm_1.2',
  fileName: `${title}.zip`,
  fileSize: 1000,
  filePath: `${title}.zip`,
  entryPoint: 'index.html',
  launchUrl: 'index.html',
  manifestData: {
    identifier: title,
    version: 'scorm_1.2',
    organizations: [],
    resources: [],
  },
  createdBy: new mongoose.Types.ObjectId(uploader || instructorId),
  uploadedBy: new mongoose.Types.ObjectId(uploader || instructorId),
  uploadedByModel: 'Staff' as const,
  isPublished: true,
  status: 'published',
});

describe('Instructor Phase 3: Classes & Dashboard', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }

    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });
    await User.deleteMany({ _id: { $in: [instructorId, adminId] } });

    // Create User FIRST (required by personValidation middleware)
    await User.create({
      _id: new mongoose.Types.ObjectId(instructorId),
      email: 'instructor1@example.com',
      passwordHash: await hashPassword('Password123!'),
      roles: ['staff'],
      primaryRole: 'staff',
      status: 'active',
    });
    // THEN create Staff with same _id
    await Staff.create({
      _id: new mongoose.Types.ObjectId(instructorId),
      name: { first: 'Staff', last: 'One' },
      email: 'instructor1@example.com',
    });

    // Create User FIRST (required by personValidation middleware)
    await User.create({
      _id: new mongoose.Types.ObjectId(adminId),
      email: 'admin@example.com',
      passwordHash: await hashPassword('Password123!'),
      roles: ['global-admin'],
      primaryRole: 'global-admin',
      status: 'active',
    });
    // THEN create Admin with same _id
    await Admin.create({
      _id: new mongoose.Types.ObjectId(adminId),
      name: { first: 'Admin', last: 'User' },
      email: 'admin@example.com',
    });
  });

  afterAll(async () => {
    await ClassModel.deleteMany({});
    await ClassEnrollment.deleteMany({});
    await CourseEnrollment.deleteMany({});
    await Learner.deleteMany({});
    await User.deleteMany({ roles: 'learner' });
    await ContentAttempt.deleteMany({});
    await CourseContent.deleteMany({});
    await Course.deleteMany({});
    await ProgramLevel.deleteMany({});
    await Program.deleteMany({});
    await ScormPackage.deleteMany({});
    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });
    await User.deleteMany({ _id: { $in: [instructorId, adminId] } });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ClassModel.deleteMany({});
    await ClassEnrollment.deleteMany({});
    await CourseEnrollment.deleteMany({});
    await Learner.deleteMany({});
    await User.deleteMany({ roles: 'learner' });
    await ContentAttempt.deleteMany({});
    await CourseContent.deleteMany({});
    await Course.deleteMany({});
    await ProgramLevel.deleteMany({});
    await Program.deleteMany({});
    await ScormPackage.deleteMany({});
  });

  it('returns classes with learner counts and completion/pass rates, plus dashboard aggregates', async () => {
    const program = await Program.create({
      name: 'Program Alpha',
      description: 'Program Alpha',
      duration: '4 months',
      createdBy: new mongoose.Types.ObjectId(adminId),
      department: masterDepartmentId,
    });
    const programLevel = await ProgramLevel.create({
      program: program._id,
      name: 'Level 1',
      order: 1,
      createdBy: new mongoose.Types.ObjectId(adminId),
      department: masterDepartmentId,
    });
    const klass = await ClassModel.create({
      name: 'Class 1',
      program: program._id,
      programLevel: programLevel._id,
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId(adminId),
      instructors: [new mongoose.Types.ObjectId(instructorId)],
    });

    const pkg = await ScormPackage.create(makePackage('Pkg1'));
    const course = await Course.create({
      title: 'Course 1',
      description: 'Course 1',
      program: program._id,
      programLevel: programLevel._id,
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId(adminId),
    });
    const courseContent = await CourseContent.create({
      course: course._id,
      contentType: 'scorm',
      scormPackageId: pkg._id,
      order: 1,
      createdBy: new mongoose.Types.ObjectId(adminId),
    });

    // Create Users FIRST (required by personValidation middleware)
    const learner1Id = new mongoose.Types.ObjectId();
    const learner2Id = new mongoose.Types.ObjectId();
    await User.create([
      {
        _id: learner1Id,
        email: 's1@example.com',
        passwordHash: await hashPassword('Learner123!'),
        roles: ['learner'],
        primaryRole: 'learner',
        status: 'active',
      },
      {
        _id: learner2Id,
        email: 's2@example.com',
        passwordHash: await hashPassword('Learner123!'),
        roles: ['learner'],
        primaryRole: 'learner',
        status: 'active',
      },
    ]);
    // THEN create Learners with same _ids
    const learner1 = await Learner.create({
      _id: learner1Id,
      name: { first: 'Learner', last: 'One' },
      email: 's1@example.com',
    });
    const learner2 = await Learner.create({
      _id: learner2Id,
      name: { first: 'Learner', last: 'Two' },
      email: 's2@example.com',
    });

    await ClassEnrollment.create([
      {
        learner: learner1._id,
        class: klass._id,
        program: program._id,
        programLevel: programLevel._id,
      },
      {
        learner: learner2._id,
        class: klass._id,
        program: program._id,
        programLevel: programLevel._id,
      },
    ]);

    await ContentAttempt.create([
      {
        learner: learner1._id,
        courseContent: courseContent._id,
        contentType: 'scorm',
        status: 'completed',
      },
      {
        learner: learner1._id,
        courseContent: courseContent._id,
        contentType: 'scorm',
        status: 'completed',
        passed: true,
      },
      {
        learner: learner2._id,
        courseContent: courseContent._id,
        contentType: 'scorm',
        status: 'in_progress',
      },
    ] as any);

    await CourseEnrollment.create([
      {
        learner: learner1._id,
        course: course._id,
        program: program._id,
        programLevel: programLevel._id,
        class: klass._id,
        status: 'completed',
        progress: 100,
        startedAt: new Date(),
        completedAt: new Date(),
      },
      {
        learner: learner2._id,
        course: course._id,
        program: program._id,
        programLevel: programLevel._id,
        class: klass._id,
        status: 'active',
        progress: 50,
        startedAt: new Date(),
      },
    ]);

    const classRes = await request(app)
      .get('/api/v1/staff/classes')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(classRes.status).toBe(200);
    const { items } = classRes.body.data;
    expect(items[0].learners).toBe(2);
    expect(items[0].completion).toBe(50);

    const dashboardRes = await request(app)
      .get('/api/v1/staff/dashboard')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.data.classes).toBe(1);
    expect(dashboardRes.body.data.learners).toBe(2);
    expect(dashboardRes.body.data.activePackages).toBe(1);
  });
});
