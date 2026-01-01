#!/usr/bin/env node
/**
 * Migrate Subject/Exam content into Course/CourseContent.
 * Usage: node scripts/migrate-content-to-coursecontent.js [env-file] [--dry-run]
 *        [--program-level-map <subject-to-programlevel.json>] [--scorm-course-map <scorm-to-course.json>]
 *
 * program-level map format (JSON):
 * {
 *   "<subjectId>": "<programLevelId>"
 * }
 *
 * scorm-course map format (JSON):
 * {
 *   "<scormPackageId>": "<courseId>"
 * }
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes('--dry-run');

const programLevelIndex = rawArgs.findIndex((arg) => arg === '--program-level-map');
const programLevelPath =
  programLevelIndex >= 0 ? rawArgs[programLevelIndex + 1] : null;

const scormCourseIndex = rawArgs.findIndex((arg) => arg === '--scorm-course-map');
const scormCoursePath = scormCourseIndex >= 0 ? rawArgs[scormCourseIndex + 1] : null;

const args = rawArgs.filter(
  (arg) =>
    arg !== '--dry-run' &&
    arg !== '--program-level-map' &&
    arg !== programLevelPath &&
    arg !== '--scorm-course-map' &&
    arg !== scormCoursePath
);

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

const loadMap = (mapPath) => {
  if (!mapPath) return {};
  try {
    return JSON.parse(fs.readFileSync(path.resolve(mapPath), 'utf8'));
  } catch (err) {
    console.error(`❌ Failed to read map file: ${err.message}`);
    process.exit(1);
  }
};

const programLevelMap = loadMap(programLevelPath);
const scormCourseMap = loadMap(scormCoursePath);

const subjectSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    academicYear: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    duration: String,
    department: mongoose.Schema.Types.ObjectId,
    program: mongoose.Schema.Types.ObjectId,
    archived: Boolean,
    archivedAt: Date,
  },
  { strict: false }
);

const examSchema = new mongoose.Schema(
  {
    subject: mongoose.Schema.Types.ObjectId,
    program: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);

const scormSchema = new mongoose.Schema({}, { strict: false });

const courseSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    program: mongoose.Schema.Types.ObjectId,
    programLevel: mongoose.Schema.Types.ObjectId,
    department: mongoose.Schema.Types.ObjectId,
    isArchived: Boolean,
    archivedAt: Date,
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);

const courseContentSchema = new mongoose.Schema(
  {
    course: mongoose.Schema.Types.ObjectId,
    contentType: String,
    scormPackageId: mongoose.Schema.Types.ObjectId,
    customContentId: mongoose.Schema.Types.ObjectId,
    order: Number,
    isRequired: Boolean,
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { strict: false }
);

const Subject = mongoose.model('Subject', subjectSchema, 'subjects');
const Exam = mongoose.model('Exam', examSchema, 'exams');
const ScormPackage = mongoose.model('ScormPackage', scormSchema, 'scormpackages');
const Course = mongoose.model('Course', courseSchema, 'courses');
const CourseContent = mongoose.model('CourseContent', courseContentSchema, 'coursecontents');

const ensureCourse = async (subject) => {
  if (!subject.program) {
    return null;
  }
  const existing = await Course.findOne({ program: subject.program, title: subject.name }).lean();
  if (existing) {
    return existing;
  }
  const programLevel = programLevelMap[subject._id.toString()];
  const payload = {
    title: subject.name,
    description: subject.description,
    program: subject.program,
    programLevel: programLevel || undefined,
    department: subject.department,
    isArchived: !!subject.archived,
    archivedAt: subject.archivedAt,
    createdBy: subject.createdBy,
  };
  if (dryRun) {
    return payload;
  }
  return await Course.create(payload);
};

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    const subjects = await Subject.find({});
    const exams = await Exam.find({});

    const courseBySubjectId = new Map();
    let createdCourses = 0;
    let createdContents = 0;

    for (const subject of subjects) {
      const course = await ensureCourse(subject);
      if (!course) {
        continue;
      }
      if (!course._id) {
        createdCourses += 1;
        continue;
      }
      courseBySubjectId.set(subject._id.toString(), course);
      if (!dryRun && course.isNew) {
        createdCourses += 1;
      }
    }

    for (const exam of exams) {
      if (!exam.subject) {
        continue;
      }
      const course = courseBySubjectId.get(exam.subject.toString());
      if (!course || !course._id) {
        continue;
      }
      const existing = await CourseContent.findOne({
        course: course._id,
        customContentId: exam._id,
      }).lean();
      if (existing) {
        continue;
      }
      const count = await CourseContent.countDocuments({ course: course._id });
      const payload = {
        course: course._id,
        contentType: 'custom',
        customContentId: exam._id,
        order: count + 1,
        isRequired: true,
        createdBy: exam.createdBy || course.createdBy,
      };
      if (!dryRun) {
        await CourseContent.create(payload);
      }
      createdContents += 1;
    }

    if (Object.keys(scormCourseMap).length) {
      for (const [scormId, courseId] of Object.entries(scormCourseMap)) {
        const scormPackage = await ScormPackage.findById(scormId).lean();
        if (!scormPackage) {
          continue;
        }
        const existing = await CourseContent.findOne({
          course: courseId,
          scormPackageId: scormId,
        }).lean();
        if (existing) {
          continue;
        }
        const count = await CourseContent.countDocuments({ course: courseId });
        const payload = {
          course: courseId,
          contentType: 'scorm',
          scormPackageId: scormId,
          order: count + 1,
          isRequired: true,
          createdBy: scormPackage.createdBy,
        };
        if (!dryRun) {
          await CourseContent.create(payload);
        }
        createdContents += 1;
      }
    }

    console.log(`\n✅ Course/CourseContent migration ${dryRun ? 'dry-run' : 'complete'}`);
    console.log(`Courses created: ${createdCourses}`);
    console.log(`CourseContent created: ${createdContents}`);
  })
  .then(() => mongoose.connection.close())
  .catch((err) => {
    console.error('\n❌ Failed to migrate content to Course/CourseContent');
    console.error('  Message:', err.message);
    process.exit(1);
  });
