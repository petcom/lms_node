#!/usr/bin/env node
/**
 * Backfill ProgramEnrollment and CourseEnrollment from ClassEnrollment.
 * Usage: node scripts/migrate-enrollments.js [env-file] [--dry-run] [--verify]
 */

const mongoose = require('mongoose');
const path = require('path');

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes('--dry-run');
const verifyOnly = rawArgs.includes('--verify');

const args = rawArgs.filter((arg) => arg !== '--dry-run' && arg !== '--verify');
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

const classEnrollmentSchema = new mongoose.Schema(
  {
    learner: mongoose.Schema.Types.ObjectId,
    class: mongoose.Schema.Types.ObjectId,
    program: mongoose.Schema.Types.ObjectId,
    programLevel: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);

const classSchema = new mongoose.Schema(
  {
    program: mongoose.Schema.Types.ObjectId,
    programLevel: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);

const programEnrollmentSchema = new mongoose.Schema(
  {
    learner: mongoose.Schema.Types.ObjectId,
    program: mongoose.Schema.Types.ObjectId,
    status: String,
    enrolledAt: Date,
  },
  { strict: false }
);

const courseSchema = new mongoose.Schema(
  {
    program: mongoose.Schema.Types.ObjectId,
    programLevel: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);

const courseEnrollmentSchema = new mongoose.Schema(
  {
    learner: mongoose.Schema.Types.ObjectId,
    course: mongoose.Schema.Types.ObjectId,
    program: mongoose.Schema.Types.ObjectId,
    programLevel: mongoose.Schema.Types.ObjectId,
    class: mongoose.Schema.Types.ObjectId,
    status: String,
    progress: Number,
    startedAt: Date,
  },
  { strict: false }
);

const ClassEnrollment = mongoose.model('ClassEnrollment', classEnrollmentSchema, 'classenrollments');
const ClassModel = mongoose.model('Class', classSchema, 'classes');
const ProgramEnrollment = mongoose.model(
  'ProgramEnrollment',
  programEnrollmentSchema,
  'programenrollments'
);
const Course = mongoose.model('Course', courseSchema, 'courses');
const CourseEnrollment = mongoose.model(
  'CourseEnrollment',
  courseEnrollmentSchema,
  'courseenrollments'
);

const run = async () => {
  await mongoose.connect(MONGO_URL);

  const classEnrollments = await ClassEnrollment.find({}).lean();
  const classIds = classEnrollments.map((entry) => entry.class).filter(Boolean);
  const classes = await ClassModel.find({ _id: { $in: classIds } }).lean();
  const classMap = new Map(classes.map((doc) => [doc._id.toString(), doc]));

  let createdProgramEnrollments = 0;
  let createdCourseEnrollments = 0;
  let missingCourses = 0;

  for (const entry of classEnrollments) {
    const classDoc = entry.class ? classMap.get(entry.class.toString()) : null;
    const programId = entry.program || classDoc?.program;
    const programLevelId = entry.programLevel || classDoc?.programLevel;

    if (!programId) continue;

    const existingProgram = await ProgramEnrollment.findOne({
      learner: entry.learner,
      program: programId,
    }).lean();

    if (!existingProgram) {
      createdProgramEnrollments += 1;
      if (!dryRun && !verifyOnly) {
        await ProgramEnrollment.create({
          learner: entry.learner,
          program: programId,
          status: 'active',
          enrolledAt: new Date(),
        });
      }
    }

    if (!programLevelId) {
      continue;
    }

    const courses = await Course.find({
      program: programId,
      programLevel: programLevelId,
    }).lean();

    if (!courses.length) {
      missingCourses += 1;
      continue;
    }

    for (const course of courses) {
      const existingCourse = await CourseEnrollment.findOne({
        learner: entry.learner,
        course: course._id,
      }).lean();

      if (existingCourse) continue;

      createdCourseEnrollments += 1;
      if (!dryRun && !verifyOnly) {
        await CourseEnrollment.create({
          learner: entry.learner,
          course: course._id,
          program: programId,
          programLevel: programLevelId,
          class: entry.class,
          status: 'active',
          progress: 0,
          startedAt: new Date(),
        });
      }
    }
  }

  console.log('✅ Enrollment migration summary');
  console.log(`- Program enrollments to create: ${createdProgramEnrollments}`);
  console.log(`- Course enrollments to create: ${createdCourseEnrollments}`);
  console.log(`- Class enrollments with no matching courses: ${missingCourses}`);

  if (verifyOnly) {
    const programCount = await ProgramEnrollment.countDocuments();
    const courseCount = await CourseEnrollment.countDocuments();
    console.log(`- Existing ProgramEnrollment count: ${programCount}`);
    console.log(`- Existing CourseEnrollment count: ${courseCount}`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('❌ Failed to migrate enrollments', err);
  process.exit(1);
});
