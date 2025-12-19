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

export default async (): Promise<void> => {
  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Create in-memory MongoDB instance
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Store the URI for use in tests
  process.env.MONGO_TEST_URI = mongoUri;
  process.env.NODE_ENV = 'test';

  // Store the server instance globally for teardown
  (global as any).__MONGOSERVER__ = mongoServer;

  console.log('✓ MongoDB Memory Server started');
  console.log(`  URI: ${mongoUri}`);
};
