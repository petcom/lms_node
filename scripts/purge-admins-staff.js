#!/usr/bin/env node
/**
 * Purge all Admin and Staff records, plus matching User records.
 * Usage: CONFIRM=YES node scripts/purge-admins-staff.js [env-file]
 */

const mongoose = require('mongoose');
const path = require('path');

const envFile = process.argv[2] || '.env';
const envPath = path.resolve(__dirname, '..', envFile);

if (process.env.CONFIRM !== 'YES') {
  console.error('❌ Refusing to run without CONFIRM=YES');
  process.exit(1);
}

console.log(`\n🔍 Loading environment from: ${envFile}`);

try {
  require('dotenv-safe').config({ path: envPath, allowEmptyValues: true });
} catch (err) {
  console.error(`❌ Failed to load environment file: ${err.message}`);
  process.exit(1);
}

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('❌ MONGO_URL not found in environment variables');
  process.exit(1);
}

const Admin = mongoose.model('Admin', new mongoose.Schema({}, { strict: false }));
const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }));
const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const [admins, staff] = await Promise.all([
      Admin.find({}).select('_id').lean(),
      Staff.find({}).select('_id').lean(),
    ]);

    const adminIds = admins.map((doc) => doc._id);
    const staffIds = staff.map((doc) => doc._id);
    const userIds = [...adminIds, ...staffIds];

    const [adminResult, staffResult, userResult] = await Promise.all([
      Admin.deleteMany({}),
      Staff.deleteMany({}),
      userIds.length > 0
        ? User.deleteMany({ _id: { $in: userIds }, role: { $in: ['global-admin', 'staff'] } })
        : Promise.resolve({ deletedCount: 0 }),
    ]);

    console.log('\n✅ Purge complete');
    console.log(`Admins deleted: ${adminResult.deletedCount || 0}`);
    console.log(`Staff deleted: ${staffResult.deletedCount || 0}`);
    console.log(`Users deleted: ${userResult.deletedCount || 0}`);
  })
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error('\n❌ Failed to purge admins/staff');
    console.error('  Message:', err.message);
    process.exit(1);
  });
