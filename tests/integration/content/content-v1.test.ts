import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import Department from '../../../model/Academic/Department';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import CustomContent from '../../../model/Content/CustomContent';
import Course from '../../../model/Content/Course';

const adminToken = 'test-admin-token';
const masterDepartmentId = new mongoose.Types.ObjectId(
  process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00'
);

describe('Content v1 API', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Promise.all([
      Department.deleteMany({}),
      ScormPackage.deleteMany({}),
      CustomContent.deleteMany({}),
      Course.deleteMany({}),
    ]);

    await Department.create({
      _id: masterDepartmentId,
      name: 'Master Department',
      code: 'MASTER',
      level: 'master',
    });
  });

  it('creates and lists custom content', async () => {
    const createRes = await request(app)
      .post('/api/v1/content/custom')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customType: 'quiz',
        title: 'Custom Quiz 1',
        payload: { questions: 5 },
        departmentId: masterDepartmentId.toString(),
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.title).toBe('Custom Quiz 1');

    const listRes = await request(app)
      .get('/api/v1/content?type=custom')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    const titles = listRes.body.items.map((item: any) => item.title);
    expect(titles).toContain('Custom Quiz 1');
  });

  it('returns content detail by id', async () => {
    const content = await CustomContent.create({
      title: 'Custom Exam',
      customType: 'exam',
      payload: { duration: 45 },
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId('0000000000000000000000a1'),
    });

    const res = await request(app)
      .get(`/api/v1/content/${content._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Custom Exam');
  });

  it('lists scorm content in the unified catalog', async () => {
    await ScormPackage.create({
      packageId: 'pkg-alpha',
      title: 'Alpha Package',
      description: 'Alpha package',
      version: 'scorm_1.2',
      fileName: 'alpha.zip',
      fileSize: 1234,
      filePath: '/tmp/alpha.zip',
      manifestData: {
        identifier: 'alpha-manifest',
        version: 'scorm_1.2',
        organizations: [],
      },
      launchUrl: '/launch/alpha',
      entryPoint: 'index.html',
      createdBy: new mongoose.Types.ObjectId('0000000000000000000000a1'),
      department: masterDepartmentId,
      maxScore: 100,
      isGraded: true,
    });

    const res = await request(app)
      .get('/api/v1/content?type=scorm')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const titles = res.body.items.map((item: any) => item.title);
    expect(titles).toContain('Alpha Package');
  });

  it('renders a course and caches output', async () => {
    const custom = await CustomContent.create({
      title: 'Intro Section',
      customType: 'other',
      html: '<h1>Intro</h1>',
      css: 'h1 { color: red; }',
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId('0000000000000000000000a1'),
    });

    const course = await Course.create({
      title: 'Course Alpha',
      department: masterDepartmentId,
      segments: [
        {
          segmentId: new mongoose.Types.ObjectId().toString(),
          type: 'custom',
          contentId: custom._id,
        },
      ],
    });

    const renderRes = await request(app)
      .get(`/api/v1/content/courses/${course._id.toString()}/render`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(renderRes.status).toBe(200);
    expect(renderRes.body.data.html).toContain('Intro');

    const cachedRes = await request(app)
      .get(`/api/v1/content/courses/${course._id.toString()}/render`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cachedRes.status).toBe(200);
    expect(cachedRes.body.data.html).toContain('Intro');
  });

  it('records custom progress and returns attempts', async () => {
    const custom = await CustomContent.create({
      title: 'Quiz Section',
      customType: 'quiz',
      payload: { questions: 3 },
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId('0000000000000000000000a1'),
    });

    const course = await Course.create({
      title: 'Course Beta',
      department: masterDepartmentId,
      segments: [
        {
          segmentId: 'segment-1',
          type: 'custom',
          contentId: custom._id,
        },
      ],
    });

    const progressRes = await request(app)
      .post(`/api/v1/content/custom/${custom._id.toString()}/progress`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId: course._id.toString(),
        segmentId: 'segment-1',
        eventType: 'quiz_complete',
        payload: { score: 90, maxScore: 100, durationSec: 120 },
      });

    expect(progressRes.status).toBe(200);

    const attemptsRes = await request(app)
      .get(`/api/v1/content/${custom._id.toString()}/attempts`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(attemptsRes.status).toBe(200);
    expect(attemptsRes.body.items.length).toBeGreaterThan(0);
  });

  it('returns unified reporting summary', async () => {
    const custom = await CustomContent.create({
      title: 'Practice Section',
      customType: 'practice',
      payload: { steps: 2 },
      department: masterDepartmentId,
      createdBy: new mongoose.Types.ObjectId('0000000000000000000000a1'),
    });

    const course = await Course.create({
      title: 'Course Gamma',
      department: masterDepartmentId,
      segments: [
        {
          segmentId: 'segment-2',
          type: 'custom',
          contentId: custom._id,
        },
      ],
    });

    await request(app)
      .post(`/api/v1/content/custom/${custom._id.toString()}/progress`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseId: course._id.toString(),
        segmentId: 'segment-2',
        eventType: 'section_complete',
        payload: { score: 100, maxScore: 100, durationSec: 60 },
      });

    const reportRes = await request(app)
      .get(`/api/v1/content/reports?courseId=${course._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.items.length).toBeGreaterThan(0);
  });
});
