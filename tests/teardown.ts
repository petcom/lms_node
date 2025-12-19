/**
 * Jest Global Teardown
 * Cleans up test environment after all tests
 */

import mongoose from 'mongoose';

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
};
