import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Course from '../model/Content/Course';
import ProgramLevel from '../model/Academic/ProgramLevel';

dotenv.config();

const resolveMongoUrl = (): string => {
  const url = process.env.MONGO_URL;
  if (!url) {
    throw new Error('MONGO_URL is not defined');
  }
  return url;
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const fix = args.has('--fix');

if (dryRun && fix) {
  throw new Error('Use either --dry-run or --fix, not both.');
}

type Report = {
  programLevels: number;
  courses: number;
  orphanCourses: number;
  missingCourseRefs: number;
  missingLevelRefs: number;
  programMismatches: number;
  fixesApplied: number;
};

const run = async (): Promise<void> => {
  const mongoUrl = resolveMongoUrl();
  await mongoose.connect(mongoUrl);

  const levels = await ProgramLevel.find({}).select('_id program courses').lean();
  const courses = await Course.find({}).select('_id program programLevel').lean();

  const courseById = new Map<string, any>();
  courses.forEach((course) => {
    courseById.set(course._id.toString(), course);
  });

  const levelById = new Map<string, any>();
  levels.forEach((level) => {
    levelById.set(level._id.toString(), level);
  });

  const report: Report = {
    programLevels: levels.length,
    courses: courses.length,
    orphanCourses: 0,
    missingCourseRefs: 0,
    missingLevelRefs: 0,
    programMismatches: 0,
    fixesApplied: 0,
  };

  courses.forEach((course) => {
    if (course.programLevel && !levelById.has(course.programLevel.toString())) {
      report.orphanCourses += 1;
    }
  });

  for (const level of levels) {
    const levelId = level._id.toString();
    const levelProgramId = level.program?.toString();
    const levelCourses = (level.courses || []).map((id: any) => id.toString());

    const actualCourses = courses.filter(
      (course) => course.programLevel?.toString() === levelId
    );
    const actualCourseIds = actualCourses
      .filter((course) => course.program?.toString() === levelProgramId)
      .map((course) => course._id.toString());

    levelCourses.forEach((courseId: string) => {
      const course = courseById.get(courseId);
      if (!course) {
        report.missingCourseRefs += 1;
        return;
      }
      if (levelProgramId && course.program?.toString() !== levelProgramId) {
        report.programMismatches += 1;
      }
    });

    actualCourses.forEach((course) => {
      if (!levelCourses.includes(course._id.toString())) {
        report.missingLevelRefs += 1;
      }
    });

    if (fix) {
      const nextCourses = Array.from(new Set(actualCourseIds)).map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      const current = levelCourses.join(',');
      const next = actualCourseIds.join(',');
      if (current !== next) {
        await ProgramLevel.findByIdAndUpdate(levelId, { courses: nextCourses });
        report.fixesApplied += 1;
      }
    }
  }

  console.log('Course catalog integrity report');
  console.log(`ProgramLevels: ${report.programLevels}`);
  console.log(`Courses: ${report.courses}`);
  console.log(`Orphan courses (invalid programLevel): ${report.orphanCourses}`);
  console.log(`Missing course refs on ProgramLevel.courses: ${report.missingCourseRefs}`);
  console.log(`Missing ProgramLevel.courses refs for course.programLevel: ${report.missingLevelRefs}`);
  console.log(`Program mismatches between Course and ProgramLevel: ${report.programMismatches}`);
  console.log(`Fixes applied: ${report.fixesApplied}`);

  if (dryRun) {
    console.log('Dry-run mode: no updates applied.');
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Course catalog integrity report failed');
  console.error(err);
  process.exitCode = 1;
});
