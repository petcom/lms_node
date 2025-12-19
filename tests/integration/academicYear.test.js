/**
 * Integration Tests for Academic Year Management
 * Tests CRUD operations for academic years
 */

const request = require('supertest');
const app = require('../../app/app');
const AcademicYear = require('../../model/Academic/AcademicYear');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../helpers/dbHelper');

describe('Academic Year Integration Tests', () => {
  let adminToken;
  let adminId;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Create and login admin for protected routes
    const registerResponse = await request(app)
      .post('/api/v1/admins/register')
      .send({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'Admin@123'
      });

    adminId = registerResponse.body.data._id;

    const loginResponse = await request(app)
      .post('/api/v1/admins/login')
      .send({
        email: 'admin@test.com',
        password: 'Admin@123'
      });

    adminToken = loginResponse.body.data.token;
  });

  describe('POST /api/v1/academic-years', () => {
    it('should create academic year with valid data', async () => {
      const yearData = {
        name: '2024-2025',
        fromYear: '2024-01-01',
        toYear: '2025-12-31'
      };

      const response = await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(yearData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('name', yearData.name);
    });

    it('should reject creation without authentication', async () => {
      const yearData = {
        name: '2024-2025',
        fromYear: '2024-01-01',
        toYear: '2025-12-31'
      };

      const response = await request(app)
        .post('/api/v1/academic-years')
        .send(yearData);

      expect(response.status).toBe(401);
    });

    it('should reject creation with invalid year format', async () => {
      const yearData = {
        name: 'Invalid Year',
        fromYear: '2024-01-01',
        toYear: '2025-12-31'
      };

      const response = await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(yearData);

      expect(response.status).toBe(400);
    });

    it('should reject duplicate academic year name', async () => {
      const yearData = {
        name: '2024-2025',
        fromYear: '2024-01-01',
        toYear: '2025-12-31'
      };

      // First creation
      await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(yearData);

      // Duplicate creation
      const response = await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(yearData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/v1/academic-years', () => {
    beforeEach(async () => {
      // Create test academic years
      await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '2024-2025',
          fromYear: '2024-01-01',
          toYear: '2025-12-31'
        });

      await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '2025-2026',
          fromYear: '2025-01-01',
          toYear: '2026-12-31'
        });
    });

    it('should get all academic years', async () => {
      const response = await request(app)
        .get('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should require authentication to view academic years', async () => {
      const response = await request(app)
        .get('/api/v1/academic-years');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/academic-years/:id', () => {
    let yearId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '2024-2025',
          fromYear: '2024-01-01',
          toYear: '2025-12-31'
        });

      yearId = createResponse.body.data._id;
    });

    it('should get single academic year by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/academic-years/${yearId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('_id', yearId);
      expect(response.body.data).toHaveProperty('name', '2024-2025');
    });

    it('should return 404 for non-existent ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/academic-years/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/v1/academic-years/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/v1/academic-years/:id', () => {
    let yearId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '2024-2025',
          fromYear: '2024-01-01',
          toYear: '2025-12-31'
        });

      yearId = createResponse.body.data._id;
    });

    it('should update academic year', async () => {
      const updateData = {
        name: '2024-2025',
        isCurrent: true
      };

      const response = await request(app)
        .put(`/api/v1/academic-years/${yearId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isCurrent', true);
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/academic-years/${yearId}`)
        .send({ isCurrent: true });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/academic-years/:id', () => {
    let yearId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/v1/academic-years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '2024-2025',
          fromYear: '2024-01-01',
          toYear: '2025-12-31'
        });

      yearId = createResponse.body.data._id;
    });

    it('should delete academic year', async () => {
      const response = await request(app)
        .delete(`/api/v1/academic-years/${yearId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/academic-years/${yearId}`);

      expect(response.status).toBe(401);
    });
  });
});
