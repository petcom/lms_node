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

const instructorId = new mongoose.Types.ObjectId('0000000000000000000000b1');
const learnerId = new mongoose.Types.ObjectId('0000000000000000000000c1');
const learnerToken = 'test-learner-token';

const makePackageData = (pkgId: string) => ({
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
});

const seedAttempt = async () => {
  const pkg = await ScormPackage.create(makePackageData(`runtime-${Date.now()}`));
  await Learner.deleteMany({ _id: learnerId });
  await Learner.create({
    _id: learnerId,
    name: 'Runtime Learner',
    email: 'runtime.learner@example.com',
    password: 'password123',
    role: 'learner',
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

  return { pkg, attemptId: attempt._id.toString() };
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
    await Learner.deleteMany({ _id: learnerId });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await ScormPackage.deleteMany({});
    await ScormAttempt.deleteMany({});
    await Learner.deleteMany({ _id: learnerId });
  });

  it('runs initialize → set → commit → get → terminate for a learner attempt', async () => {
    const { attemptId } = await seedAttempt();

    const initRes = await request(app)
      .post(`/api/v1/scorm/runtime/${attemptId}/initialize`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    expect(initRes.status).toBe(200);
    expect(initRes.body.data.result).toBe('true');

    await request(app)
      .put(
        `/api/v1/scorm/runtime/${attemptId}/value/${encodeURIComponent('cmi.core.lesson_status')}`
      )
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ value: 'completed' });

    await request(app)
      .put(`/api/v1/scorm/runtime/${attemptId}/value/${encodeURIComponent('cmi.core.score.raw')}`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ value: '92' });

    const commitRes = await request(app)
      .post(`/api/v1/scorm/runtime/${attemptId}/commit`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.data.result).toBe('true');

    const attemptAfterCommit = await ScormAttempt.findById(attemptId).lean();
    expect((attemptAfterCommit as any)?.cmi?.score?.raw).toBe(92);
    expect((attemptAfterCommit as any)?.cmi?.lesson_status).toBe('completed');

    const getRes = await request(app)
      .get(`/api/v1/scorm/runtime/${attemptId}/value/${encodeURIComponent('cmi.core.score.raw')}`)
      .set('Authorization', `Bearer ${learnerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.value).toBe('92');

    const terminateRes = await request(app)
      .post(`/api/v1/scorm/runtime/${attemptId}/terminate`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    expect(terminateRes.status).toBe(200);
    expect(terminateRes.body.data.result).toBe('true');

    const attempt = await ScormAttempt.findById(attemptId);
    expect(attempt?.status).toBe('completed');
    expect((attempt as any)?.cmi?.lesson_status).toBe('completed');
  });

  it('updates heartbeat for an active session', async () => {
    const { attemptId } = await seedAttempt();
    await request(app)
      .post(`/api/v1/scorm/runtime/${attemptId}/initialize`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    const heartbeatRes = await request(app)
      .post(`/api/v1/scorm/runtime/${attemptId}/heartbeat`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    expect(heartbeatRes.status).toBe(200);
    expect(heartbeatRes.body.data.active).toBe(true);
  });

  it('returns SCORM error code for invalid elements', async () => {
    const { attemptId } = await seedAttempt();
    await request(app)
      .post(`/api/v1/scorm/runtime/${attemptId}/initialize`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({});

    const res = await request(app)
      .put(`/api/v1/scorm/runtime/${attemptId}/value/${encodeURIComponent('cmi.invalid.element')}`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ value: 'nope' });

    expect(res.status).toBe(200);
    expect(res.body.data.errorCode).toBe('401');
    expect(res.body.data.result).toBe('false');
  });
});
