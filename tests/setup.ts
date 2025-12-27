/**
 * Jest Global Setup
 * Initializes test environment before all tests
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Polyfill for buffer-equal-constant-time issue with Jest
if (typeof global.Uint8Array === 'undefined') {
  (global as any).Uint8Array = Uint8Array;
}

const globalSetup = async (): Promise<void> => {
  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Create in-memory MongoDB instance
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Store the URI for use in tests
  process.env.MONGO_TEST_URI = mongoUri;
  // Use a deterministic, long secret to satisfy generateToken length checks during tests
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-integration-suite-32chars';
  process.env.BYPASS_AUTH_FOR_TESTS = 'true';
  process.env.MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';
  process.env.NODE_ENV = 'test';

  // Store the server instance globally for teardown
  (global as any).__MONGOSERVER__ = mongoServer;

  console.log('✓ MongoDB Memory Server started');
  console.log(`  URI: ${mongoUri}`);
};

export default globalSetup;
(module as any).exports = globalSetup;
