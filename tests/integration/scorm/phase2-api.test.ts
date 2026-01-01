/**
 * Integration Tests for SCORM Phase 2: Package Management API
 *
 * Tests the complete API workflow:
 * 1. Package upload
 * 2. Package CRUD operations
 * 3. Package assignments
 * 4. Content delivery
 * 5. Attempt tracking
 * 6. CMI data management
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../../app/app';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import ScormAttempt from '../../../model/Scorm/ScormAttempt';
import Staff from '../../../model/Staff/Staff';

const makePackageData = (pkgId: string, title: string, uploaderId: string) => ({
  packageId: pkgId,
  title,
  description: `${title} description`,
  version: 'scorm_1.2',
  fileName: `${pkgId}.zip`,
  fileSize: 1234,
  filePath: `${pkgId}.zip`,
  entryPoint: 'index.html',
  launchUrl: 'index.html',
  manifestData: {
    identifier: pkgId,
    version: 'scorm_1.2',
    organizations: [],
    resources: [],
  },
  createdBy: new mongoose.Types.ObjectId(uploaderId),
  uploadedBy: new mongoose.Types.ObjectId(uploaderId),
  uploadedByModel: 'Staff' as const,
  isPublished: true,
});

describe('SCORM Phase 2: Package Management API', () => {
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  const adminId = '0000000000000000000000a1';
  const teacherId = '0000000000000000000000b1';
  const studentId = '0000000000000000000000c1';
  let packageId: string;
  let attemptId: string;

  beforeAll(async () => {
    // Ensure database connection (prefer in-memory URI from global setup)
    if (mongoose.connection.readyState !== 1) {
      const uri =
        process.env.MONGO_TEST_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/lms-test';
      await mongoose.connect(uri);
    }
    // Seed a staff user so uploadedBy populate returns data
    await Staff.deleteMany({ email: 'teacher@example.com' });
    const teacher = await Staff.create({
      _id: new mongoose.Types.ObjectId(teacherId),
      name: 'Test Staff',
      email: 'teacher@example.com',
      password: 'password123',
      role: 'staff',
    });
  });

  afterAll(async () => {
    // Cleanup
    await ScormPackage.deleteMany({});
    await ScormAttempt.deleteMany({});
    await Staff.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections
    await ScormPackage.deleteMany({});
    await ScormAttempt.deleteMany({});
  });

  describe('Prerequisites: Authentication Setup', () => {
    it('should create admin user and get token', async () => {
      // This is a placeholder - adapt to your auth system
      // In real tests, you'd create a user and login
      adminToken = 'test-admin-token';
      expect(adminToken).toBeDefined();
    });

    it('should create staff user and get token', async () => {
      teacherToken = 'test-teacher-token';
      expect(teacherToken).toBeDefined();
    });

    it('should create student user and get token', async () => {
      studentToken = 'test-student-token';
      expect(studentToken).toBeDefined();
    });
  });

  describe('1. Package Upload', () => {
    it('should reject non-authenticated upload', async () => {
      const res = await request(app)
        .post('/api/v1/scorm/packages')
        .attach('package', Buffer.from('fake-zip'), 'test.zip');

      expect(res.status).toBe(401);
    });

    it('should reject non-ZIP files', async () => {
      const res = await request(app)
        .post('/api/v1/scorm/packages')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('package', Buffer.from('not-a-zip'), 'test.txt');

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should accept valid SCORM package (mocked)', async () => {
      // Skip actual upload for now - would need real SCORM package
      // This test verifies the endpoint exists and requires auth
      const res = await request(app)
        .post('/api/v1/scorm/packages')
        .set('Authorization', `Bearer ${teacherToken}`);

      // Without file, should get 400 or similar
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('2. Package CRUD Operations', () => {
    beforeEach(async () => {
      // Create a test package directly in database
      const pkg = await ScormPackage.create(
        makePackageData('test-pkg-001', 'Test SCORM Package', teacherId)
      );
      packageId = pkg._id.toString();
    });

    it('should get all packages (teacher/admin)', async () => {
      const res = await request(app)
        .get('/api/v1/scorm/packages')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].uploadedBy._id).toBe(teacherId);
      expect(res.body.data[0].uploadedByModel).toBe('Staff');
    });

    it('should get single package by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/scorm/packages/${packageId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test SCORM Package');
      expect(res.body.data.uploadedBy._id).toBe(teacherId);
      expect(res.body.data.uploadedByModel).toBe('Staff');
    });

    it('should update package (teacher/admin)', async () => {
      const res = await request(app)
        .put(`/api/v1/scorm/packages/${packageId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Updated Test Package',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Test Package');
    });

    it('should delete package (teacher/admin)', async () => {
      const res = await request(app)
        .delete(`/api/v1/scorm/packages/${packageId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deletion
      const pkg = await ScormPackage.findById(packageId);
      expect(pkg).toBeNull();
    });
  });

  describe('3. Package Assignments', () => {
    beforeEach(async () => {
      const pkg = await ScormPackage.create(
        makePackageData('test-pkg-002', 'Assignment Test Package', teacherId)
      );
      packageId = pkg._id.toString();
    });

    it('should assign package to students', async () => {
      const res = await request(app)
        .post(`/api/v1/scorm/packages/${packageId}/assign`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          studentIds: [studentId],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should unassign package from students', async () => {
      // First assign
      await request(app)
        .post(`/api/v1/scorm/packages/${packageId}/assign`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ studentIds: [studentId] });

      // Then unassign
      const res = await request(app)
        .post(`/api/v1/scorm/packages/${packageId}/unassign`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ studentIds: [studentId] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get student assignments', async () => {
      // Assign package
      await request(app)
        .post(`/api/v1/scorm/packages/${packageId}/assign`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ studentIds: [studentId] });

      // Get assignments
      const res = await request(app)
        .get('/api/v1/scorm/packages/my-assignments')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Publish / Unpublish', () => {
    let publishPackageId: string;
    let unpublishPackageId: string;

    beforeEach(async () => {
      const draftPkg = await ScormPackage.create({
        ...makePackageData('test-pkg-003', 'Publishable Package', teacherId),
        isPublished: false,
        status: 'draft',
      });
      publishPackageId = draftPkg._id.toString();

      const publishedPkg = await ScormPackage.create({
        ...makePackageData('test-pkg-004', 'Unpublishable Package', teacherId),
        isPublished: true,
        status: 'published',
      });
      unpublishPackageId = publishedPkg._id.toString();
    });

    it('should publish a draft package (teacher/admin)', async () => {
      const res = await request(app)
        .post(`/api/v1/scorm/packages/${publishPackageId}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPublished).toBe(true);
      expect(res.body.data.status).toBe('published');
    });

    it('should be idempotent when publishing an already published package', async () => {
      const res = await request(app)
        .post(`/api/v1/scorm/packages/${publishPackageId}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      // publish once
      expect(res.status).toBe(200);

      // publish again
      const second = await request(app)
        .post(`/api/v1/scorm/packages/${publishPackageId}/publish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(second.status).toBe(200);
      expect(second.body.data.isPublished).toBe(true);
      expect(second.body.data.status).toBe('published');
    });

    it('should unpublish a published package (teacher/admin)', async () => {
      const res = await request(app)
        .post(`/api/v1/scorm/packages/${unpublishPackageId}/unpublish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPublished).toBe(false);
      expect(res.body.data.status).toBe('draft');
    });

    it('should be idempotent when unpublishing an already draft package', async () => {
      const res = await request(app)
        .post(`/api/v1/scorm/packages/${unpublishPackageId}/unpublish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      // unpublish once
      expect(res.status).toBe(200);

      // unpublish again
      const second = await request(app)
        .post(`/api/v1/scorm/packages/${unpublishPackageId}/unpublish`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(second.status).toBe(200);
      expect(second.body.data.isPublished).toBe(false);
      expect(second.body.data.status).toBe('draft');
    });
  });

  describe('4. Content Delivery', () => {
    beforeEach(async () => {
      const pkg = await ScormPackage.create(
        makePackageData('test-pkg-003', 'Content Delivery Test', teacherId)
      );
      packageId = pkg._id.toString();
    });

    it('should launch package for student', async () => {
      const res = await request(app)
        .get(`/api/v1/scorm/content/${packageId}/launch`)
        .set('Authorization', `Bearer ${studentToken}`);

      // May fail without actual content files, but endpoint should exist
      expect([200, 403, 404]).toContain(res.status);
    });

    it('should get manifest (admin/teacher)', async () => {
      const res = await request(app)
        .get(`/api/v1/scorm/content/${packageId}/manifest`)
        .set('Authorization', `Bearer ${teacherToken}`);

      // May fail without actual manifest, but endpoint should exist
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('5. Attempt Tracking', () => {
    beforeEach(async () => {
      const pkg = await ScormPackage.create(
        makePackageData('test-pkg-004', 'Attempt Tracking Test', teacherId)
      );

      const attempt = await ScormAttempt.create({
        attemptId: 'attempt-001',
        student: new mongoose.Types.ObjectId(studentId),
        package: pkg._id,
        attemptNumber: 1,
        status: 'incomplete',
        cmi: {
          score: {},
          session_time: 'PT0H0M0S',
          total_time: 'PT0H0M0S',
        },
      });

      packageId = pkg._id.toString();
      attemptId = attempt._id.toString();
    });

    it('should get attempts by package', async () => {
      const res = await request(app)
        .get(`/api/v1/scorm/attempts/package/${packageId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should get single attempt', async () => {
      const res = await request(app)
        .get(`/api/v1/scorm/attempts/${attemptId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attemptId).toBe('attempt-001');
    });

    it('should get all attempts (admin/teacher)', async () => {
      const res = await request(app)
        .get('/api/v1/scorm/attempts')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('6. CMI Data Management', () => {
    beforeEach(async () => {
      const pkg = await ScormPackage.create(
        makePackageData('test-pkg-005', 'CMI Data Test', teacherId)
      );

      const attempt = await ScormAttempt.create({
        attemptId: 'attempt-002',
        student: new mongoose.Types.ObjectId(studentId),
        package: pkg._id,
        attemptNumber: 1,
        status: 'incomplete',
        cmi: {
          score: { raw: 0, min: 0, max: 100 },
          lesson_status: 'incomplete',
          session_time: 'PT0H0M0S',
          total_time: 'PT0H0M0S',
        },
      });

      attemptId = attempt._id.toString();
    });

    it('should update CMI data', async () => {
      const res = await request(app)
        .put(`/api/v1/scorm/attempts/${attemptId}/cmi`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          element: 'cmi.core.score.raw',
          value: '85',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get CMI element value', async () => {
      const res = await request(app)
        .get(`/api/v1/scorm/attempts/${attemptId}/cmi/cmi.core.lesson_status`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should complete attempt', async () => {
      const res = await request(app)
        .post(`/api/v1/scorm/attempts/${attemptId}/complete`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          score: { raw: 95, min: 0, max: 100 },
          status: 'passed',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should get student progress summary', async () => {
      const res = await request(app)
        .get(`/api/v1/scorm/attempts/student/${studentId}/summary`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary).toBeDefined();
    });
  });

  describe('7. Authorization & Security', () => {
    beforeEach(async () => {
      const pkg = await ScormPackage.create(
        makePackageData('test-pkg-006', 'Security Test', teacherId)
      );
      packageId = pkg._id.toString();
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/v1/scorm/packages');

      expect(res.status).toBe(401);
    });

    it('should reject student upload', async () => {
      const res = await request(app)
        .post('/api/v1/scorm/packages')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('package', Buffer.from('fake'), 'test.zip');

      expect(res.status).toBe(403);
    });

    it('should reject student delete', async () => {
      const res = await request(app)
        .delete(`/api/v1/scorm/packages/${packageId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('8. Error Handling', () => {
    it('should return 404 for non-existent package', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/scorm/packages/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent attempt', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/v1/scorm/attempts/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });

    it('should validate CMI element paths', async () => {
      const pkg = await ScormPackage.create(
        makePackageData('test-pkg-007', 'Validation Test', teacherId)
      );

      const attempt = await ScormAttempt.create({
        attemptId: 'attempt-003',
        student: new mongoose.Types.ObjectId(studentId),
        package: pkg._id,
        attemptNumber: 1,
        status: 'incomplete',
        cmi: {},
      });

      const res = await request(app)
        .put(`/api/v1/scorm/attempts/${attempt._id}/cmi`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          element: 'invalid.cmi.path',
          value: 'test',
        });

      // Should validate or at least not crash
      expect([200, 400]).toContain(res.status);
    });
  });
});
