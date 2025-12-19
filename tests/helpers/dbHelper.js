/**
 * Test Database Helper
 * Provides utilities for connecting to and managing test database
 */

const mongoose = require('mongoose');

/**
 * Connect to test database
 */
const connectTestDB = async () => {
  const mongoUri = process.env.MONGO_TEST_URI;
  
  if (!mongoUri) {
    throw new Error('MONGO_TEST_URI not set. Make sure global setup ran.');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }
};

/**
 * Disconnect from test database
 */
const disconnectTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

/**
 * Clear all collections in test database
 */
const clearTestDB = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Drop test database
 */
const dropTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
  }
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
  dropTestDB
};
