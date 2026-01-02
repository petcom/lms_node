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
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import CourseContent from '../../../model/Academic/CourseContent';

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

    await Staff.create({
      _id: new mongoose.Types.ObjectId(instructorId),
      name: { first: 'Staff', last: 'One' },
      email: 'instructor1@example.com',
      password: 'password',
      role: 'staff',
    });

    await Admin.create({
      _id: new mongoose.Types.ObjectId(adminId),
      name: { first: 'Admin', last: 'User' },
      email: 'admin@example.com',
      password: 'password',
      role: 'global-admin',
    });
  });

  afterAll(async () => {
    await ClassModel.deleteMany({});
    await ClassEnrollment.deleteMany({});
    await Learner.deleteMany({});
    await ContentAttempt.deleteMany({});
    await CourseContent.deleteMany({});
    await Course.deleteMany({});
    await ProgramLevel.deleteMany({});
    await Program.deleteMany({});
    await ScormPackage.deleteMany({});
    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ClassModel.deleteMany({});
    await ClassEnrollment.deleteMany({});
    await Learner.deleteMany({});
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

    const learner1 = await Learner.create({
      name: { first: 'Learner', last: 'One' },
      email: 's1@example.com',
      password: 'pw',
      role: 'learner',
    });
    const learner2 = await Learner.create({
      name: { first: 'Learner', last: 'Two' },
      email: 's2@example.com',
      password: 'pw',
      role: 'learner',
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

    const classRes = await request(app)
      .get('/api/v1/staff/classes')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(classRes.status).toBe(200);
    const { items } = classRes.body.data;
    expect(items[0].learners).toBe(2);
    expect(items[0].completion).toBeGreaterThan(0);

    const dashboardRes = await request(app)
      .get('/api/v1/staff/dashboard')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(dashboardRes.status).toBe(200);
    expect(dashboardRes.body.data.classes).toBe(1);
    expect(dashboardRes.body.data.learners).toBe(2);
    expect(dashboardRes.body.data.activePackages).toBe(1);
  });
});
