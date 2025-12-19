#!/usr/bin/env node
/**
 * MongoDB Connection Test Script
 * Tests database connectivity and displays connection information
 * Usage: node scripts/test-db-connection.js [env-file]
 * Example: node scripts/test-db-connection.js .env.local
 */

const mongoose = require('mongoose');
const path = require('path');

// Determine which env file to use
const envFile = process.argv[2] || '.env';
const envPath = path.resolve(__dirname, '..', envFile);

console.log(`\n🔍 Loading environment from: ${envFile}`);

try {
  require('dotenv-safe').config({ path: envPath });
} catch (err) {
  console.error(`❌ Failed to load environment file: ${err.message}`);
  process.exit(1);
}

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('❌ MONGO_URL not found in environment variables');
  process.exit(1);
}

console.log(`\n📡 Testing MongoDB connection...`);
console.log(`Connection string: ${MONGO_URL.replace(/\/\/.*:.*@/, '//***:***@')}`);

mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('\n✅ MongoDB connected successfully\n');
    console.log('Connection Details:');
    console.log('  Database:', mongoose.connection.name);
    console.log('  Host:', mongoose.connection.host);
    console.log('  Port:', mongoose.connection.port);
    console.log('  Ready State:', mongoose.connection.readyState, '(1 = connected)');
    
    return mongoose.connection.db.admin().serverInfo();
  })
  .then(info => {
    console.log('  MongoDB Version:', info.version);
    console.log('  Platform:', info.platform);
    
    return mongoose.connection.db.admin().listDatabases();
  })
  .then(result => {
    console.log('\n📊 Available Databases:');
    result.databases.forEach(db => {
      const size = (db.sizeOnDisk / 1024 / 1024).toFixed(2);
      console.log(`  - ${db.name} (${size} MB)`);
    });
    
    return mongoose.connection.close();
  })
  .then(() => {
    console.log('\n✅ Test completed successfully\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ MongoDB connection error:');
    console.error('  Message:', err.message);
    if (err.code) console.error('  Code:', err.code);
    if (err.name) console.error('  Type:', err.name);
    console.error('\n💡 Troubleshooting:');
    console.error('  1. Check if MongoDB is running: brew services list | grep mongodb');
    console.error('  2. Verify MONGO_URL in your .env file');
    console.error('  3. For local MongoDB: mongodb://localhost:27017/database_name');
    console.error('  4. For MongoDB Atlas: Check connection string and network access\n');
    process.exit(1);
  });
