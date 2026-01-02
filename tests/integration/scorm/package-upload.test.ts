import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import request from 'supertest';
import mongoose from 'mongoose';
import AdmZip from 'adm-zip';
import { StorageFactory } from '../../../utils/scorm/storage/StorageFactory';
import Staff from '../../../model/Staff/Staff';
import Admin from '../../../model/Staff/Admin';

const instructorId = '0000000000000000000000b1';
const adminId = '0000000000000000000000a1';
const instructorToken = 'test-instructor-token';

const makeManifest = () => `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST01" version="1.2">
  <organizations>
    <organization identifier="ORG1">
      <title>Sample Course</title>
      <item identifier="ITEM1" identifierref="RES1">
        <title>Lesson 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES1" type="webcontent" href="index.html" />
  </resources>
</manifest>`;

const buildZip = (withManifest = true): Buffer => {
  const zip = new AdmZip();
  if (withManifest) {
    zip.addFile('imsmanifest.xml', Buffer.from(makeManifest(), 'utf-8'));
  }
  zip.addFile('index.html', Buffer.from('<html><body>Hi</body></html>', 'utf-8'));
  return zip.toBuffer();
};

let app: any;

describe('SCORM Package Upload API', () => {
  beforeAll(async () => {
    process.env.SCORM_STORAGE_PROVIDER = 'local';
    process.env.SCORM_STORAGE_PATH = path.join(__dirname, '../../tmp-scorm-upload');
    process.env.SCORM_MAX_FILE_SIZE = '1024'; // 1KB for test

    StorageFactory.resetProvider();
    const mod = await import('../../../app/app');
    app = mod.default;

    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }

    await Staff.deleteMany({ _id: instructorId });
    await Admin.deleteMany({ _id: adminId });

    await Staff.create({
      _id: new mongoose.Types.ObjectId(instructorId),
      name: { first: 'Staff', last: 'Upload' },
      email: 'instructor-upload@example.com',
      password: 'password',
      role: 'staff',
    });

    await Admin.create({
      _id: new mongoose.Types.ObjectId(adminId),
      name: { first: 'Admin', last: 'Upload' },
      email: 'admin-upload@example.com',
      password: 'password',
      role: 'global-admin',
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await fs.remove(path.join(__dirname, '../../tmp-scorm-upload'));
  });

  beforeEach(async () => {
    const pkgModel = (await import('../../../model/Scorm/ScormPackage')).default;
    await pkgModel.deleteMany({});
  });

  it('uploads a valid SCORM package and returns normalized data', async () => {
    const zipBuffer = buildZip();

    const res = await request(app)
      .post('/api/v1/scorm/packages')
      .set('Authorization', `Bearer ${instructorToken}`)
      .field('title', 'Upload Test')
      .field('isGraded', 'true')
      .field('maxScore', '50')
      .field('dueDate', '2025-12-31T00:00:00Z')
      .attach('file', zipBuffer, 'course.zip');

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Upload Test');
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.isPublished).toBe(false);
    expect(res.body.data.launchUrl).toBe('index.html');
    expect(res.body.data.packageId).toBeDefined();
  });

  it('rejects missing manifest with 400', async () => {
    const zipBuffer = buildZip(false);

    const res = await request(app)
      .post('/api/v1/scorm/packages')
      .set('Authorization', `Bearer ${instructorToken}`)
      .field('title', 'Bad Package')
      .attach('file', zipBuffer, 'bad.zip');

    expect(res.status).toBe(400);
  });

  it('rejects oversize payload with 413', async () => {
    const zip = new AdmZip();
    zip.addFile('imsmanifest.xml', Buffer.from(makeManifest(), 'utf-8'));
    zip.addFile('index.html', crypto.randomBytes(4096)); // ~4KB > 1KB limit
    const bigBuffer = zip.toBuffer();

    const res = await request(app)
      .post('/api/v1/scorm/packages')
      .set('Authorization', `Bearer ${instructorToken}`)
      .field('title', 'Too Big')
      .attach('file', bigBuffer, 'big.zip');

    expect(res.status).toBe(413);
  });

  it('rejects unauthenticated upload with 401', async () => {
    const zipBuffer = buildZip();

    const res = await request(app)
      .post('/api/v1/scorm/packages')
      .attach('file', zipBuffer, 'noauth.zip')
      .field('title', 'No Auth');

    expect(res.status).toBe(401);
  });
});
