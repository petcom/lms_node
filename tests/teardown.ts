/**
 * Jest Global Teardown
 * Cleans up test environment after all tests
 */

import mongoose from 'mongoose';
import redisClient from '../config/redis';

export default async (): Promise<void> => {
  // Close mongoose connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Stop MongoDB Memory Server
  if ((global as any).__MONGOSERVER__) {
    await (global as any).__MONGOSERVER__.stop();
    console.log('✓ MongoDB Memory Server stopped');
  }

  try {
    await redisClient.quit();
  } catch (error) {
    console.warn('Redis client quit during teardown failed:', (error as Error).message);
  }
};
