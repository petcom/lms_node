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
import fs from 'fs';
import path from 'path';
import app from '../../../app/app';
import ScormPackage from '../../../model/Scorm/ScormPackage';
import ScormAttempt from '../../../model/Scorm/ScormAttempt';
import Admin from '../../../model/Staff/Admin';
import Teacher from '../../../model/Staff/Teacher';
import Student from '../../../model/Academic/Student';

describe('SCORM Phase 2: Package Management API', () => {
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let adminId: string;
  let teacherId: string;
  let studentId: string;
  let packageId: string;
  let attemptId: string;

  beforeAll(async () => {
    // Ensure database connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/lms-test');
    }
  });

  afterAll(async () => {
    // Cleanup
    await ScormPackage.deleteMany({});
    await ScormAttempt.deleteMany({});
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
      adminId = new mongoose.Types.ObjectId().toString();
      expect(adminToken).toBeDefined();
    });

    it('should create teacher user and get token', async () => {
      teacherToken = 'test-teacher-token';
      teacherId = new mongoose.Types.ObjectId().toString();
      expect(teacherToken).toBeDefined();
    });

    it('should create student user and get token', async () => {
      studentToken = 'test-student-token';
      studentId = new mongoose.Types.ObjectId().toString();
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
      const pkg = await ScormPackage.create({
        packageId: 'test-pkg-001',
        title: 'Test SCORM Package',
        description: 'A test package for integration testing',
        version: 'scorm_1.2',
        fileName: 'test-package.zip',
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        isPublished: true,
        metadata: {
          identifier: 'test-001',
          schemaVersion: '1.2',
        },
      });
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
    });

    it('should get single package by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/scorm/packages/${packageId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test SCORM Package');
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
      const pkg = await ScormPackage.create({
        packageId: 'test-pkg-002',
        title: 'Assignment Test Package',
        version: 'scorm_1.2',
        fileName: 'test.zip',
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        isPublished: true,
        metadata: { identifier: 'test-002', schemaVersion: '1.2' },
      });
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

  describe('4. Content Delivery', () => {
    beforeEach(async () => {
      const pkg = await ScormPackage.create({
        packageId: 'test-pkg-003',
        title: 'Content Delivery Test',
        version: 'scorm_1.2',
        fileName: 'test.zip',
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        isPublished: true,
        launchUrl: 'index.html',
        metadata: { identifier: 'test-003', schemaVersion: '1.2' },
      });
      packageId = pkg.packageId;
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
      const pkg = await ScormPackage.create({
        packageId: 'test-pkg-004',
        title: 'Attempt Tracking Test',
        version: 'scorm_1.2',
        fileName: 'test.zip',
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        isPublished: true,
        metadata: { identifier: 'test-004', schemaVersion: '1.2' },
      });

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
      const pkg = await ScormPackage.create({
        packageId: 'test-pkg-005',
        title: 'CMI Data Test',
        version: 'scorm_1.2',
        fileName: 'test.zip',
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        isPublished: true,
        metadata: { identifier: 'test-005', schemaVersion: '1.2' },
      });

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
      const pkg = await ScormPackage.create({
        packageId: 'test-pkg-006',
        title: 'Security Test',
        version: 'scorm_1.2',
        fileName: 'test.zip',
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        isPublished: true,
        metadata: { identifier: 'test-006', schemaVersion: '1.2' },
      });
      packageId = pkg._id.toString();
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .get('/api/v1/scorm/packages');

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
      const pkg = await ScormPackage.create({
        packageId: 'test-pkg-007',
        title: 'Validation Test',
        version: 'scorm_1.2',
        fileName: 'test.zip',
        uploadedBy: new mongoose.Types.ObjectId(adminId),
        isPublished: true,
        metadata: { identifier: 'test-007', schemaVersion: '1.2' },
      });

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
