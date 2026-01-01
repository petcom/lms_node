#!/usr/bin/env node
/**
 * Set passingStyleScore on the master department.
 * Usage: node scripts/set-master-passing-style-score.js [env-file] [score] [--force]
 */

const mongoose = require('mongoose');
const path = require('path');

const rawArgs = process.argv.slice(2);
const force = rawArgs.includes('--force');
const args = rawArgs.filter((arg) => arg !== '--force');

const isNumeric = (value) => value !== undefined && value !== null && !Number.isNaN(Number(value));

const envFile = args[0] && args[0].endsWith('.env') ? args[0] : '.env';
const scoreArg = args[0] && !args[0].endsWith('.env') ? args[0] : args[1];

const requestedScore = isNumeric(scoreArg) ? Number(scoreArg) : 80;

if (Number.isNaN(requestedScore) || requestedScore < 0 || requestedScore > 100) {
  console.error('❌ passingStyleScore must be a number between 0 and 100');
  process.exit(1);
}

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

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true, sparse: true },
    level: { type: String, required: true, enum: ['master', 'top', 'sub'] },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    passingStyleScore: { type: Number, min: 0, max: 100, default: null },
  },
  { timestamps: true }
);

const Department = mongoose.model('Department', departmentSchema);

const masterId = process.env.MASTER_DEPARTMENT_ID;

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const query = masterId ? { _id: masterId } : { level: 'master' };
    const master = await Department.findOne(query);

    if (!master) {
      console.error('❌ Master department not found');
      process.exit(1);
    }

    if (!force && typeof master.passingStyleScore === 'number') {
      console.log('ℹ️  Master department already has passingStyleScore set');
      console.log(`passingStyleScore=${master.passingStyleScore}`);
      return;
    }

    master.passingStyleScore = requestedScore;
    await master.save();

    console.log('✅ Master passingStyleScore updated');
    console.log(`passingStyleScore=${master.passingStyleScore}`);
  })
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error('\n❌ Failed to update master passingStyleScore');
    console.error('  Message:', err.message);
    process.exit(1);
  });
