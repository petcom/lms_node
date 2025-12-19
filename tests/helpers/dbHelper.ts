/**
 * Test Database Helper
 * Provides utilities for connecting to and managing test database
 */

import mongoose from 'mongoose';

/**
 * Connect to test database
 */
export const connectTestDB = async (): Promise<void> => {
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
export const disconnectTestDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

/**
 * Clear all collections in test database
 */
export const clearTestDB = async (): Promise<void> => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Drop test database
 */
export const dropTestDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
  }
};
