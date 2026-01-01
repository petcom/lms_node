/**
 * Integration Tests for Admin Authentication
 * Tests admin registration and login flows
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app/app');
const Admin = require('../../model/Staff/Admin');
const { connectTestDB, clearTestDB, disconnectTestDB } = require('../helpers/dbHelper');

describe('Admin Authentication Integration Tests', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('POST /api/v1/staff/admins/register', () => {
    it('should register a new admin with valid data', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'Admin@123'
      };

      const response = await request(app)
        .post('/api/v1/staff/admins/register')
        .send(adminData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('name', adminData.name);
      expect(response.body.data).toHaveProperty('email', adminData.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should reject registration with weak password', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/v1/staff/admins/register')
        .send(adminData);

      expect(response.status).toBe(400);
    });

    it('should reject registration with duplicate email', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'Admin@123'
      };

      // First registration
      await request(app)
        .post('/api/v1/staff/admins/register')
        .send(adminData);

      // Duplicate registration
      const response = await request(app)
        .post('/api/v1/staff/admins/register')
        .send(adminData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/staff/admins/register')
        .send({ name: 'Test Admin' });

      expect(response.status).toBe(400);
    });

    it('should reject registration with invalid email format', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'invalid-email',
        password: 'Admin@123'
      };

      const response = await request(app)
        .post('/api/v1/staff/admins/register')
        .send(adminData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/staff/admins/login', () => {
    beforeEach(async () => {
      // Create a test admin for login tests
      await request(app)
        .post('/api/v1/staff/admins/register')
        .send({
          name: 'Test Admin',
          email: 'admin@test.com',
          password: 'Admin@123'
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/staff/admins/login')
        .send({
          email: 'admin@test.com',
          password: 'Admin@123'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('token');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/staff/admins/login')
        .send({
          email: 'admin@test.com',
          password: 'WrongPassword@123'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.message).toMatch(/invalid/i);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/staff/admins/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Admin@123'
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.message).toMatch(/invalid/i);
    });

    it('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/v1/staff/admins/login')
        .send({ email: 'admin@test.com' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/staff/admins/profile', () => {
    let authToken;

    beforeEach(async () => {
      // Register and login to get auth token
      await request(app)
        .post('/api/v1/staff/admins/register')
        .send({
          name: 'Test Admin',
          email: 'admin@test.com',
          password: 'Admin@123'
        });

      const loginResponse = await request(app)
        .post('/api/v1/staff/admins/login')
        .send({
          email: 'admin@test.com',
          password: 'Admin@123'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should get admin profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/staff/admins/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('name', 'Test Admin');
      expect(response.body.data).toHaveProperty('email', 'admin@test.com');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should reject profile access without token', async () => {
      const response = await request(app)
        .get('/api/v1/staff/admins/profile');

      expect(response.status).toBe(401);
    });

    it('should reject profile access with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/staff/admins/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
