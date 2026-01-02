import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import ContentAttempt from '../../../model/Academic/ContentAttempt';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';
import ClassModel from '../../../model/Academic/Class';
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

const makePackage = (overrides: Partial<any> = {}) => {
  const uploader = overrides.uploadedBy || new mongoose.Types.ObjectId(instructorId);
  return {
    packageId: new mongoose.Types.ObjectId().toString(),
    title: overrides.title || 'Instructor Package',
    description: 'Test package',
    version: 'scorm_1.2',
    fileName: 'test.zip',
    fileSize: 1000,
    filePath: 'test.zip',
    entryPoint: 'index.html',
    launchUrl: 'index.html',
    manifestData: {
      identifier: 'pkg-1',
      version: 'scorm_1.2',
      organizations: [],
      resources: [],
    },
    createdBy: uploader,
    uploadedBy: uploader,
    uploadedByModel: overrides.uploadedByModel || 'Staff',
    isPublished: overrides.isPublished ?? false,
    status: overrides.status || 'draft',
  };
};

describe('Instructor Phase 2: Packages & Assignments', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }

    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });

    await Staff.create({
      _id: new mongoose.Types.ObjectId(instructorId),
      name: 'Staff One',
      email: 'instructor1@example.com',
      password: 'password',
      role: 'staff',
    });

    await Admin.create({
      _id: new mongoose.Types.ObjectId(adminId),
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password',
      role: 'global-admin',
    });
  });

  afterAll(async () => {
    await ScormPackage.deleteMany({});
    await ContentAttempt.deleteMany({});
    await CourseContent.deleteMany({});
    await Course.deleteMany({});
    await ProgramLevel.deleteMany({});
    await Program.deleteMany({});
    await ClassModel.deleteMany({});
    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ScormPackage.deleteMany({});
    await ContentAttempt.deleteMany({});
    await CourseContent.deleteMany({});
    await Course.deleteMany({});
    await ProgramLevel.deleteMany({});
    await Program.deleteMany({});
    await ClassModel.deleteMany({});
  });

  it('lists only instructor-owned packages with attempt stats and supports status filtering', async () => {
    const pkgPublished = await ScormPackage.create(
      makePackage({ title: 'Published', isPublished: true, status: 'published' })
    );
    await ScormPackage.create(makePackage({ title: 'Draft', status: 'draft' }));

    await ScormPackage.create(
      makePackage({
        title: 'Other instructor',
        uploadedBy: new mongoose.Types.ObjectId('0000000000000000000000ff'),
        uploadedByModel: 'Staff',
      })
    );

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
    const course = await Course.create({
      title: 'Course Alpha',
      description: 'Course Alpha',
      program: program._id,
      programLevel: programLevel._id,
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId(adminId),
    });
    const courseContent = await CourseContent.create({
      course: course._id,
      contentType: 'scorm',
      scormPackageId: pkgPublished._id,
      order: 1,
      createdBy: new mongoose.Types.ObjectId(adminId),
    });

    await ContentAttempt.create([
      {
        learner: new mongoose.Types.ObjectId(),
        courseContent: courseContent._id,
        contentType: 'scorm',
        status: 'completed',
      },
      {
        learner: new mongoose.Types.ObjectId(),
        courseContent: courseContent._id,
        contentType: 'scorm',
        status: 'completed',
        passed: true,
      },
    ] as any);

    const listRes = await request(app)
      .get('/api/v1/staff/packages?limit=5')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    const { items, total } = listRes.body.data;
    expect(total).toBe(2);
    const published = items.find((i: any) => i.title === 'Published');
    expect(published.attemptsCount).toBe(2);
    expect(published.progressPct).toBe(100);

    const filterRes = await request(app)
      .get('/api/v1/staff/packages?status=draft')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.data.items.length).toBe(1);
    expect(filterRes.body.data.items[0].status).toBe('draft');
  });

  it('creates assignments for instructor-owned classes and packages', async () => {
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

    const pkg = await ScormPackage.create(makePackage({ title: 'Assignable' }));

    const dueDate = new Date().toISOString();
    const res = await request(app)
      .post('/api/v1/staff/assignments/assign')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ packageId: pkg._id.toString(), classIds: [klass._id.toString()], dueDate });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.assignmentId).toBe(pkg._id.toString());

    const updated = await ScormPackage.findById(pkg._id);
    expect(updated?.assignedTo?.classes?.map(String)).toContain(klass._id.toString());
    expect(updated?.dueDate).toBeDefined();
  });

  it('validates assignment input and ownership', async () => {
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
      name: 'Other class',
      program: program._id,
      programLevel: programLevel._id,
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId(adminId),
      instructors: [new mongoose.Types.ObjectId(adminId)],
    });

    const pkg = await ScormPackage.create(
      makePackage({
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        uploadedByModel: 'Admin',
      })
    );

    const missing = await request(app)
      .post('/api/v1/staff/assignments/assign')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ classIds: [] });
    expect(missing.status).toBe(400);

    const unauthorizedClass = await request(app)
      .post('/api/v1/staff/assignments/assign')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ packageId: pkg._id.toString(), classIds: [klass._id.toString()] });
    expect(unauthorizedClass.status).toBe(404);

    const ownedClass = await ClassModel.create({
      name: 'Owned class',
      program: program._id,
      programLevel: programLevel._id,
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId(adminId),
      instructors: [new mongoose.Types.ObjectId(instructorId)],
    });

    const unauthorizedPackage = await request(app)
      .post('/api/v1/staff/assignments/assign')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ packageId: pkg._id.toString(), classIds: [ownedClass._id.toString()] });
    expect(unauthorizedPackage.status).toBe(404);
  });
});
