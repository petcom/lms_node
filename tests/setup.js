/**
 * Jest Global Setup
 * Initializes test environment before all tests
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Polyfill for buffer-equal-constant-time issue with Jest
if (typeof global.Uint8Array === 'undefined') {
  global.Uint8Array = Uint8Array;
}

let mongoServer;

module.exports = async () => {
  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Store the URI for use in tests
  process.env.MONGO_TEST_URI = mongoUri;
  process.env.NODE_ENV = 'test';
  
  // Store the server instance globally for teardown
  global.__MONGOSERVER__ = mongoServer;

  console.log('✓ MongoDB Memory Server started');
  console.log(`  URI: ${mongoUri}`);
};
