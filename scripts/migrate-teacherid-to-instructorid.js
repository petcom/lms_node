#!/usr/bin/env node
/**
 * Migrate legacy teacherId field to instructorId on Staff documents.
 * Usage: node scripts/migrate-teacherid-to-instructorid.js [env-file] [--keep-legacy]
 */

const mongoose = require('mongoose');
const path = require('path');

const rawArgs = process.argv.slice(2);
const keepLegacy = rawArgs.includes('--keep-legacy');
const args = rawArgs.filter((arg) => arg !== '--keep-legacy');

const envFile = args[0] && args[0].endsWith('.env') ? args[0] : '.env';
const envPath = path.resolve(__dirname, '..', envFile);

console.log(`\n🔍 Loading environment from: ${envFile}`);

try {
  require('dotenv-safe').config({ path: envPath, allowEmptyValues: true });
} catch (err) {
  console.error(`❌ Failed to load environment file: ${err.message}`);
  process.exit(1);
}

const MONGO_URL = process.env.MONGO_URL || process.env.MONGO_URI;

if (!MONGO_URL) {
  console.error('❌ MONGO_URL or MONGO_URI not found in environment variables');
  process.exit(1);
}

const staffSchema = new mongoose.Schema(
  {
    instructorId: { type: String },
    teacherId: { type: String },
  },
  { strict: false }
);

const Staff = mongoose.model('Staff', staffSchema, 'staffs');

const dropLegacyIndex = async () => {
  const collection = Staff.collection;
  const indexes = await collection.indexes();
  const legacyIndex = indexes.find((index) => index.name === 'teacherId_1');
  if (legacyIndex) {
    await collection.dropIndex('teacherId_1');
    console.log('✅ Dropped legacy index teacherId_1');
  } else {
    console.log('ℹ️  Legacy index teacherId_1 not found');
  }
};

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const missingInstructor = await Staff.countDocuments({
      instructorId: { $exists: false },
      teacherId: { $exists: true, $ne: null },
    });

    if (missingInstructor > 0) {
      const result = await Staff.updateMany(
        { instructorId: { $exists: false }, teacherId: { $exists: true, $ne: null } },
        [{ $set: { instructorId: '$teacherId' } }]
      );
      console.log(`✅ Backfilled instructorId for ${result.modifiedCount} staff records`);
    } else {
      console.log('ℹ️  No staff records missing instructorId with teacherId present');
    }

    await dropLegacyIndex();

    if (!keepLegacy) {
      const unsetResult = await Staff.updateMany({}, { $unset: { teacherId: '' } });
      console.log(`✅ Removed teacherId from ${unsetResult.modifiedCount} staff records`);
    } else {
      console.log('ℹ️  Keeping legacy teacherId field (--keep-legacy)');
    }
  })
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error('\n❌ Failed to migrate teacherId to instructorId');
    console.error('  Message:', err.message);
    process.exit(1);
  });
