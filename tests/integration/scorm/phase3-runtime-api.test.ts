/**
 * SCORM Phase 3: Runtime API Integration Tests (wired)
 * Exercises the runtime endpoints with the in-memory auth bypass tokens.
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import ScormAttempt from '../../../model/Scorm/ScormAttempt';
import Learner from '../../../model/Academic/Learner';
import Department from '../../../model/Academic/Department';
import Program from '../../../model/Academic/Program';
import ProgramLevel from '../../../model/Academic/ProgramLevel';
import Course from '../../../model/Content/Course';
import CourseContent from '../../../model/Academic/CourseContent';
import ContentAttempt from '../../../model/Academic/ContentAttempt';
import Admin from '../../../model/Staff/Admin';
import User from '../../../model/Auth/User';
import { hashPassword } from '../../../utils/helpers';

const instructorId = new mongoose.Types.ObjectId('0000000000000000000000b1');
const adminId = new mongoose.Types.ObjectId('0000000000000000000000a1');
const departmentId = new mongoose.Types.ObjectId('0000000000000000000000d1');
const learnerId = new mongoose.Types.ObjectId('0000000000000000000000c1');
const learnerToken = 'test-learner-token';

const makePackageData = (
  pkgId: string,
  context: { courseId: mongoose.Types.ObjectId; programId: mongoose.Types.ObjectId; programLevelId: mongoose.Types.ObjectId }
) => ({
  packageId: pkgId,
  title: 'Runtime Test Package',
  description: 'Runtime wiring test',
  version: 'scorm_1.2',
  fileName: `${pkgId}.zip`,
  fileSize: 1024,
  filePath: `${pkgId}.zip`,
  entryPoint: 'index.html',
  launchUrl: 'index.html',
  manifestData: {
    identifier: pkgId,
    version: 'scorm_1.2',
    organizations: [],
    resources: [],
  },
  createdBy: instructorId,
  uploadedBy: instructorId,
  uploadedByModel: 'Staff' as const,
  status: 'published',
  isActive: true,
  trackingOptions: {
    trackTime: true,
    trackScore: true,
    trackCompletion: true,
    trackInteractions: true,
    allowMultipleAttempts: true,
    maxAttempts: 5,
    timeLimit: 1200,
  },
  course: context.courseId,
  program: context.programId,
  programLevel: context.programLevelId,
  department: departmentId,
});

const seedAcademicContext = async () => {
  await Admin.deleteMany({ _id: adminId });
  await User.deleteMany({ _id: { $in: [adminId, learnerId] } });
  await Department.deleteMany({ _id: departmentId });
  await Program.deleteMany({});
  await ProgramLevel.deleteMany({});
  await Course.deleteMany({});
  await CourseContent.deleteMany({});

  await Department.create({
    _id: departmentId,
    name: 'Runtime Department',
    level: 'top',
  });

  const passwordHash = await hashPassword('Password123!');

  // Create User FIRST (required by personValidation middleware)
  await User.create({
    _id: adminId,
    email: 'runtime.admin@example.com',
    passwordHash,
    roles: ['global-admin'],
    primaryRole: 'global-admin',
    status: 'active',
  });
  // THEN create Admin with same _id
  await Admin.create({
    _id: adminId,
    name: { first: 'Runtime', last: 'Admin' },
    email: 'runtime.admin@example.com',
    department: departmentId,
  });

  const program = await Program.create({
    name: 'Runtime Program',
    description: 'Runtime Program Description',
    duration: '4 years',
    createdBy: adminId,
    department: departmentId,
  });

  const programLevel = await ProgramLevel.create({
    program: program._id,
    name: 'Level 1',
    description: 'Level 1',
    order: 1,
    department: departmentId,
    createdBy: adminId,
  });

  const course = await Course.create({
    title: 'Runtime Course',
    description: 'Runtime Course Description',
    program: program._id,
    programLevel: programLevel._id,
    department: departmentId,
    createdBy: adminId,
  });

  return {
    programId: program._id,
    programLevelId: programLevel._id,
    courseId: course._id,
  };
};

const seedAttempt = async () => {
  const context = await seedAcademicContext();
  const pkg = await ScormPackage.create(makePackageData(`runtime-${Date.now()}`, context));
  const courseContent = await CourseContent.create({
    course: context.courseId,
    contentType: 'scorm',
    scormPackageId: pkg._id,
    order: 1,
    isRequired: true,
    createdBy: adminId,
  });
  await Learner.deleteMany({ _id: learnerId });
  // Create User FIRST (required by personValidation middleware)
  await User.create({
    _id: learnerId,
    email: 'runtime.learner@example.com',
    passwordHash: await hashPassword('Password123!'),
    roles: ['learner'],
    primaryRole: 'learner',
    status: 'active',
  });
  // THEN create Learner with same _id
  await Learner.create({
    _id: learnerId,
    name: { first: 'Runtime', last: 'Learner' },
    email: 'runtime.learner@example.com',
  });

  const attempt = await ScormAttempt.create({
    attemptId: `${pkg.packageId}-${learnerId}-1`,
    learner: learnerId,
    package: pkg._id,
    attemptNumber: 1,
    status: 'not_started',
    cmi: {
      score: {},
      session_time: 'PT0H0M0S',
      total_time: 'PT0H0M0S',
    } as any,
  });

  return { pkg, attemptId: attempt._id.toString(), courseContentId: courseContent._id };
};

describe('SCORM Phase 3: Runtime API', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_TEST_URI || process.env.MONGO_URL;
    if (mongoUri && mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await ScormPackage.deleteMany({});
    await ScormAttempt.deleteMany({});
    await ContentAttempt.deleteMany({});
    await CourseContent.deleteMany({});
    await Course.deleteMany({});
    await ProgramLevel.deleteMany({});
    await Program.deleteMany({});
    await Department.deleteMany({ _id: departmentId });
    await Admin.deleteMany({ _id: adminId });
    await Learner.deleteMany({ _id: learnerId });
    await User.deleteMany({ _id: { $in: [adminId, learnerId] } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await ScormPackage.deleteMany({});
    await ScormAttempt.deleteMany({});
    await ContentAttempt.deleteMany({});
    await CourseContent.deleteMany({});
    await Course.deleteMany({});
    await ProgramLevel.deleteMany({});
    await Program.deleteMany({});
    await Department.deleteMany({ _id: departmentId });
    await Admin.deleteMany({ _id: adminId });
    await Learner.deleteMany({ _id: learnerId });
    await User.deleteMany({ _id: { $in: [adminId, learnerId] } });
  });

  it('runs initialize → set → commit → get → terminate for a learner attempt', async () => {
    const { attemptId, courseContentId } = await seedAttempt();

    const initRes = await request(app)
      .post(`/api/v1/content/scorm/runtime/${attemptId}/initialize`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    expect(initRes.status).toBe(200);
    expect(initRes.body.data.result).toBe('true');

    await request(app)
      .put(
        `/api/v1/content/scorm/runtime/${attemptId}/value/${encodeURIComponent('cmi.core.lesson_status')}`
      )
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ value: 'completed' });

    await request(app)
      .put(`/api/v1/content/scorm/runtime/${attemptId}/value/${encodeURIComponent('cmi.core.score.raw')}`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ value: '92' });

    const commitRes = await request(app)
      .post(`/api/v1/content/scorm/runtime/${attemptId}/commit`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.data.result).toBe('true');

    const attemptAfterCommit = await ScormAttempt.findById(attemptId).lean();
    expect((attemptAfterCommit as any)?.cmi?.score?.raw).toBe(92);
    expect((attemptAfterCommit as any)?.cmi?.lesson_status).toBe('completed');

    const getRes = await request(app)
      .get(`/api/v1/content/scorm/runtime/${attemptId}/value/${encodeURIComponent('cmi.core.score.raw')}`)
      .set('Authorization', `Bearer ${learnerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.value).toBe('92');

    const terminateRes = await request(app)
      .post(`/api/v1/content/scorm/runtime/${attemptId}/terminate`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    expect(terminateRes.status).toBe(200);
    expect(terminateRes.body.data.result).toBe('true');

    const attempt = await ScormAttempt.findById(attemptId);
    expect(attempt?.status).toBe('completed');
    expect((attempt as any)?.cmi?.lesson_status).toBe('completed');

    const contentAttempt = await ContentAttempt.findOne({ scormAttemptId: attemptId }).lean();
    expect(contentAttempt).toBeTruthy();
    expect(contentAttempt?.courseContent?.toString()).toBe(courseContentId.toString());
    expect(contentAttempt?.status).toBe('completed');
    expect(contentAttempt?.score).toBe(92);
  });

  it('updates heartbeat for an active session', async () => {
    const { attemptId } = await seedAttempt();
    await request(app)
      .post(`/api/v1/content/scorm/runtime/${attemptId}/initialize`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    const heartbeatRes = await request(app)
      .post(`/api/v1/content/scorm/runtime/${attemptId}/heartbeat`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    expect(heartbeatRes.status).toBe(200);
    expect(heartbeatRes.body.data.active).toBe(true);
  });

  it('returns SCORM error code for invalid elements', async () => {
    const { attemptId } = await seedAttempt();
    await request(app)
      .post(`/api/v1/content/scorm/runtime/${attemptId}/initialize`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    const res = await request(app)
      .put(`/api/v1/content/scorm/runtime/${attemptId}/value/${encodeURIComponent('cmi.invalid.element')}`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ value: 'nope' });

    expect(res.status).toBe(200);
    expect(res.body.data.errorCode).toBe('401');
    expect(res.body.data.result).toBe('false');
  });
});
