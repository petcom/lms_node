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

const makePackage = (title: string) => ({
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
  createdBy: new mongoose.Types.ObjectId(instructorId),
  uploadedBy: new mongoose.Types.ObjectId(instructorId),
  uploadedByModel: 'Staff' as const,
  isPublished: true,
  status: 'published',
});

describe('Instructor Phase 4: Attempts Listing', () => {
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

  it('lists attempts filtered by classId and packageId, scoped to instructor classes', async () => {
    const klass = await ClassLevel.create({
      name: 'Class 1',
      description: 'Test class',
      createdBy: new mongoose.Types.ObjectId(adminId),
      instructors: [new mongoose.Types.ObjectId(instructorId)],
    });

    const pkg = await ScormPackage.create(makePackage('Pkg1'));

    const learner = await Learner.create({
      name: 'Learner One',
      email: 's1@example.com',
      password: 'pw',
      classLevels: [klass._id.toString()],
      role: 'learner',
    });

    await ScormAttempt.create({
      attemptId: 'att-1',
      learner: learner._id,
      package: pkg._id,
      attemptNumber: 1,
      status: 'completed',
      startedAt: new Date('2024-01-01T00:00:00Z'),
      completedAt: new Date('2024-01-01T01:00:00Z'),
    } as any);

    const res = await request(app)
      .get(
        `/api/v1/staff/attempts?classId=${klass._id.toString()}&packageId=${pkg._id.toString()}`
      )
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].learnerName).toBe('Learner One');
    expect(res.body.data.items[0].packageTitle).toBe('Pkg1');
    expect(res.body.data.items[0].status).toBe('completed');
  });
});
