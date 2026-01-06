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

  let mongoUri: string | undefined;

  if (!process.env.MONGO_TEST_URI) {
    process.env.MONGOMS_IP = '127.0.0.1';
    process.env.MONGOMS_PORT = process.env.MONGOMS_PORT || '27017';

    // Create in-memory MongoDB instance
    const mongoServer = await MongoMemoryServer.create({
      instance: { ip: '127.0.0.1', port: Number(process.env.MONGOMS_PORT) },
    });
    mongoUri = mongoServer.getUri();

    // Store the URI for use in tests
    process.env.MONGO_TEST_URI = mongoUri;

    // Store the server instance globally for teardown
    (global as any).__MONGOSERVER__ = mongoServer;
  }
  // Use a deterministic, long secret to satisfy generateToken length checks during tests
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-secret-key-for-integration-suite-32chars';
  process.env.BYPASS_AUTH_FOR_TESTS = 'true';
  process.env.MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';
  process.env.NODE_ENV = 'test';

  if (process.env.MONGO_TEST_URI && process.env.SKIP_DB_SETUP !== 'true') {
    console.log('✓ Using MONGO_TEST_URI for integration tests');
    console.log(`  URI: ${process.env.MONGO_TEST_URI}`);
  }

  if (mongoUri) {
    console.log('✓ MongoDB Memory Server started');
    console.log(`  URI: ${mongoUri}`);
  }

  if (process.env.MONGO_TEST_URI && process.env.SKIP_DB_SETUP !== 'true') {
    await mongoose.connect(process.env.MONGO_TEST_URI);

    const dbName = mongoose.connection.db?.databaseName || '';
    const shouldReset = /test/i.test(dbName);

    if (shouldReset) {
      await mongoose.connection.dropDatabase();
    } else {
      console.warn(
        `Skipping test DB reset because database name "${dbName}" does not look like a test database.`
      );
      const staffCollection = mongoose.connection.collection('staffs');
      const indexes = await staffCollection.indexes();
      const legacyIndex = indexes.find((index) => index.name === 'teacherId_1');
      if (legacyIndex) {
        await staffCollection.dropIndex('teacherId_1');
      }
    }

    await mongoose.disconnect();
  }
};

export default globalSetup;
(module as any).exports = globalSetup;
