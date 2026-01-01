#!/usr/bin/env node
/**
 * List all admins, staff, and learners.
 * Usage: node scripts/list-users.js [env-file]
 */

const mongoose = require('mongoose');
const path = require('path');

const envFile = process.argv[2] || '.env';
const envPath = path.resolve(__dirname, '..', envFile);

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

const Admin = mongoose.model(
  'Admin',
  new mongoose.Schema({}, { strict: false })
);
const Staff = mongoose.model(
  'Staff',
  new mongoose.Schema({}, { strict: false })
);
const Learner = mongoose.model(
  'Learner',
  new mongoose.Schema({}, { strict: false })
);

const simplify = (doc, kind) => {
  const base = {
    id: doc._id?.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    createdAt: doc.createdAt,
  };

  if (kind === 'staff') {
    return { ...base, instructorId: doc.instructorId, applicationStatus: doc.applicationStatus };
  }

  if (kind === 'learner') {
    return { ...base, learnerId: doc.learnerId, currentClassLevel: doc.currentClassLevel };
  }

  return base;
};

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const [admins, staff, learners] = await Promise.all([
      Admin.find({}).lean(),
      Staff.find({}).lean(),
      Learner.find({}).lean(),
    ]);

    console.log(`\nAdmins (${admins.length})`);
    admins.map((doc) => simplify(doc, 'global-admin')).forEach((doc) => console.log(doc));

    console.log(`\nStaff (${staff.length})`);
    staff.map((doc) => simplify(doc, 'staff')).forEach((doc) => console.log(doc));

    console.log(`\nLearners (${learners.length})`);
    learners.map((doc) => simplify(doc, 'learner')).forEach((doc) => console.log(doc));
  })
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error('\n❌ Failed to list users');
    console.error('  Message:', err.message);
    process.exit(1);
  });
