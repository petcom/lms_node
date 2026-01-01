import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ClassLevel from '../../../model/Academic/ClassLevel';
import Learner from '../../../model/Academic/Learner';
import ScormAttempt from '../../../model/Scorm/ScormAttempt';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';

const instructorId = '0000000000000000000000b1';
const adminId = '0000000000000000000000a1';
const instructorToken = 'test-instructor-token';

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
    await ClassLevel.deleteMany({});
    await Learner.deleteMany({});
    await ScormAttempt.deleteMany({});
    await ScormPackage.deleteMany({});
    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await ClassLevel.deleteMany({});
    await Learner.deleteMany({});
    await ScormAttempt.deleteMany({});
    await ScormPackage.deleteMany({});
  });

  it('returns classes with learner counts and completion/pass rates, plus dashboard aggregates', async () => {
    const klass = await ClassLevel.create({
      name: 'Class 1',
      description: 'Test class',
      createdBy: new mongoose.Types.ObjectId(adminId),
      instructors: [new mongoose.Types.ObjectId(instructorId)],
    });

    const pkg = await ScormPackage.create(makePackage('Pkg1'));

    const learner1 = await Learner.create({
      name: 'Learner One',
      email: 's1@example.com',
      password: 'pw',
      classLevels: [klass._id.toString()],
      role: 'learner',
    });
    const learner2 = await Learner.create({
      name: 'Learner Two',
      email: 's2@example.com',
      password: 'pw',
      classLevels: [klass._id.toString()],
      role: 'learner',
    });

    await ScormAttempt.create([
      {
        attemptId: 'att-1',
        learner: learner1._id,
        package: pkg._id,
        attemptNumber: 1,
        status: 'completed',
      },
      {
        attemptId: 'att-2',
        learner: learner1._id,
        package: pkg._id,
        attemptNumber: 2,
        status: 'passed',
      },
      {
        attemptId: 'att-3',
        learner: learner2._id,
        package: pkg._id,
        attemptNumber: 1,
        status: 'failed',
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
