#!/usr/bin/env node
/**
 * Migrate ScormAttempt documents to ContentAttempt.
 * Usage: node scripts/migrate-scormattempt-to-contentattempt.js [env-file] --map <package-to-coursecontent.json> [--dry-run]
 *
 * Map file format (JSON):
 * {
 *   "<scormPackageId>": "<courseContentId>"
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
  console.error('❌ Missing --map <map.json> for package to courseContent mapping');
  process.exit(1);
}

let mapping = {};
try {
  mapping = JSON.parse(fs.readFileSync(path.resolve(mapPath), 'utf8'));
} catch (err) {
  console.error(`❌ Failed to read mapping file: ${err.message}`);
  process.exit(1);
}

const scormAttemptSchema = new mongoose.Schema(
  {
    learner: mongoose.Schema.Types.ObjectId,
    package: mongoose.Schema.Types.ObjectId,
    status: String,
    startedAt: Date,
    completedAt: Date,
    scorePercentage: Number,
    cmi: {
      score: {
        raw: Number,
      },
    },
  },
  { strict: false }
);

const contentAttemptSchema = new mongoose.Schema(
  {
    learner: mongoose.Schema.Types.ObjectId,
    courseContent: mongoose.Schema.Types.ObjectId,
    contentType: String,
    status: String,
    score: Number,
    startedAt: Date,
    completedAt: Date,
  },
  { strict: false }
);

const ScormAttempt = mongoose.model('ScormAttempt', scormAttemptSchema, 'scormattempts');
const ContentAttempt = mongoose.model('ContentAttempt', contentAttemptSchema, 'contentattempts');

const mapStatus = (status) => {
  if (status === 'completed' || status === 'passed' || status === 'failed') {
    return 'completed';
  }
  return 'in_progress';
};

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const attempts = await ScormAttempt.find({});
    let created = 0;
    let skipped = 0;

    for (const attempt of attempts) {
      const packageId = attempt.package?.toString();
      const courseContentId = packageId ? mapping[packageId] : null;
      if (!courseContentId) {
        skipped += 1;
        continue;
      }

      const existing = await ContentAttempt.findOne({
        learner: attempt.learner,
        courseContent: courseContentId,
        startedAt: attempt.startedAt,
      }).lean();
      if (existing) {
        continue;
      }

      const score =
        typeof attempt.scorePercentage === 'number'
          ? attempt.scorePercentage
          : attempt.cmi?.score?.raw;

      const payload = {
        learner: attempt.learner,
        courseContent: courseContentId,
        contentType: 'scorm',
        status: mapStatus(attempt.status),
        score: typeof score === 'number' ? score : undefined,
        startedAt: attempt.startedAt || new Date(),
        completedAt: attempt.completedAt,
      };

      if (!dryRun) {
        await ContentAttempt.create(payload);
      }
      created += 1;
    }

    console.log(`\n✅ ContentAttempt migration ${dryRun ? 'dry-run' : 'complete'}`);
    console.log(`Created: ${created}`);
    console.log(`Skipped (missing mapping): ${skipped}`);
  })
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error('\n❌ Failed to migrate ScormAttempt to ContentAttempt');
    console.error('  Message:', err.message);
    process.exit(1);
  });
