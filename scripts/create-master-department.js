#!/usr/bin/env node
/**
 * Create or find the Master Department and print its id for .env
 * Usage: node scripts/create-master-department.js [env-file]
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

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true, sparse: true },
    level: { type: String, required: true, enum: ['master', 'top', 'sub'] },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  },
  { timestamps: true }
);

const Department = mongoose.model('Department', departmentSchema);

const requestedId = process.env.MASTER_DEPARTMENT_ID;

const formatOutput = (id) => {
  console.log('\n✅ Master Department ready');
  console.log(`MASTER_DEPARTMENT_ID=${id}`);
  console.log('\nSet MASTER_DEPARTMENT_ID in your .env to the value above.');
};

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const existing = await Department.findOne({ level: 'master' }).lean();

    if (existing?._id) {
      if (requestedId && requestedId !== existing._id.toString()) {
        console.warn(
          '\n⚠️  MASTER_DEPARTMENT_ID in .env does not match existing master department.'
        );
      }
      formatOutput(existing._id.toString());
      return;
    }

    const masterId = requestedId ? new mongoose.Types.ObjectId(requestedId) : new mongoose.Types.ObjectId();

    await Department.create({
      _id: masterId,
      name: 'Master Department',
      code: 'MASTER',
      level: 'master',
      parent: null,
      ancestors: [],
    });

    formatOutput(masterId.toString());
  })
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error('\n❌ Failed to create Master Department');
    console.error('  Message:', err.message);
    process.exit(1);
  });
