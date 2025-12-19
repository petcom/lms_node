/**
 * Jest Global Teardown
 * Cleans up test environment after all tests
 */

const mongoose = require('mongoose');

module.exports = async () => {
  // Close mongoose connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Stop MongoDB Memory Server
  if (global.__MONGOSERVER__) {
    await global.__MONGOSERVER__.stop();
    console.log('✓ MongoDB Memory Server stopped');
  }
};
