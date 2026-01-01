#!/usr/bin/env node
/**
 * Migrate ClassLevel documents to ProgramLevel.
 * Usage: node scripts/migrate-classlevel-to-programlevel.js [env-file] --map <map.json> [--dry-run]
 *
 * Map file format (JSON):
 * {
 *   "<classLevelId>": { "programId": "<programId>", "order": 1, "name": "Level 1" }
 * }
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes('--dry-run');

const mapIndex = rawArgs.findIndex((arg) => arg === '--map');
const mapPath = mapIndex >= 0 ? rawArgs[mapIndex + 1] : null;

const args = rawArgs.filter((arg) => arg !== '--dry-run' && arg !== '--map' && arg !== mapPath);

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

if (!mapPath) {
  console.error('❌ Missing --map <map.json> for classLevel to program mapping');
  process.exit(1);
}

let mapping = {};
try {
  mapping = JSON.parse(fs.readFileSync(path.resolve(mapPath), 'utf8'));
} catch (err) {
  console.error(`❌ Failed to read mapping file: ${err.message}`);
  process.exit(1);
}

const classLevelSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    createdBy: mongoose.Schema.Types.ObjectId,
    department: mongoose.Schema.Types.ObjectId,
    archived: Boolean,
    archivedAt: Date,
  },
  { strict: false }
);

const programLevelSchema = new mongoose.Schema(
  {
    program: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: String,
    description: String,
    order: Number,
    department: mongoose.Schema.Types.ObjectId,
    archived: Boolean,
    archivedAt: Date,
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);

const ClassLevel = mongoose.model('ClassLevel', classLevelSchema, 'classlevels');
const ProgramLevel = mongoose.model('ProgramLevel', programLevelSchema, 'programlevels');

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const classLevels = await ClassLevel.find({});
    const missingMap = [];
    const created = [];

    for (const classLevel of classLevels) {
      const key = classLevel._id.toString();
      const mapEntry = mapping[key];
      if (!mapEntry || !mapEntry.programId) {
        missingMap.push(key);
        continue;
      }

      const programId = mapEntry.programId;
      const name = mapEntry.name || classLevel.name;
      const order = Number.isFinite(mapEntry.order) ? mapEntry.order : 1;

      const existing = await ProgramLevel.findOne({ program: programId, name }).lean();
      if (existing) {
        continue;
      }

      const payload = {
        program: programId,
        name,
        description: classLevel.description,
        order,
        department: classLevel.department,
        archived: classLevel.archived,
        archivedAt: classLevel.archivedAt,
        createdBy: classLevel.createdBy,
      };

      if (!dryRun) {
        await ProgramLevel.create(payload);
      }
      created.push({ classLevelId: key, programId, name, order });
    }

    console.log(`\n✅ ProgramLevel migration ${dryRun ? 'dry-run' : 'complete'}`);
    console.log(`Created: ${created.length}`);
    if (missingMap.length) {
      console.log(`Skipped (missing mapping): ${missingMap.length}`);
    }
  })
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error('\n❌ Failed to migrate ClassLevel to ProgramLevel');
    console.error('  Message:', err.message);
    process.exit(1);
  });
