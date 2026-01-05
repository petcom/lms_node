import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Course from '../model/Content/Course';
import ProgramLevel from '../model/Academic/ProgramLevel';
import Program from '../model/Academic/Program';
import CustomContent from '../model/Content/CustomContent';
import LearnerProgress from '../model/Content/LearnerProgress';
import ContentAttempt from '../model/Academic/ContentAttempt';
import RenderedCourse from '../model/Content/RenderedCourse';
import CourseContent from '../model/Academic/CourseContent';
import ScormPackage from '../model/Scorm/ScormPackage';

dotenv.config();

const dryRun = process.argv.includes('--dry-run');

const resolveMongoUrl = (): string => {
  const url = process.env.MONGO_URL;
  if (!url) {
    throw new Error('MONGO_URL is not defined');
  }
  return url;
};

const normalizeCustomType = (value: string | undefined): string | undefined => {
  if (!value) return value;
  if (value === 'practice') return 'exercise';
  if (value === 'other') return 'custom';
  return value;
};

const backfillProgramLevelCourses = async (): Promise<number> => {
  const courses = await Course.find({ programLevel: { $exists: true, $ne: null } })
    .select('_id programLevel')
    .lean();
  const coursesByLevel = new Map<string, string[]>();
  courses.forEach((course) => {
    const levelId = course.programLevel?.toString();
    if (!levelId) return;
    const list = coursesByLevel.get(levelId) || [];
    list.push(course._id.toString());
    coursesByLevel.set(levelId, list);
  });

  let updates = 0;
  for (const [levelId, courseIds] of coursesByLevel.entries()) {
    const uniqueIds = Array.from(new Set(courseIds)).map((id) => new mongoose.Types.ObjectId(id));
    if (!dryRun) {
      await ProgramLevel.findByIdAndUpdate(levelId, { courses: uniqueIds });
    }
    updates += 1;
  }
  return updates;
};

const backfillProgramCourses = async (): Promise<number> => {
  const levels = await ProgramLevel.find({}).select('program courses').lean();
  const coursesByProgram = new Map<string, Set<string>>();
  levels.forEach((level) => {
    const programId = level.program?.toString();
    if (!programId) return;
    const set = coursesByProgram.get(programId) || new Set<string>();
    (level.courses || []).forEach((courseId: any) => set.add(courseId.toString()));
    coursesByProgram.set(programId, set);
  });

  let updates = 0;
  for (const [programId, courseSet] of coursesByProgram.entries()) {
    const courseIds = Array.from(courseSet).map((id) => new mongoose.Types.ObjectId(id));
    if (!dryRun) {
      await Program.findByIdAndUpdate(programId, { courses: courseIds });
    }
    updates += 1;
  }
  return updates;
};

const migrateCustomContentTypes = async (): Promise<number> => {
  const customContents = await CustomContent.find({}).select('_id customType').lean();
  let updates = 0;
  const tasks = customContents.map(async (content) => {
    const nextType = normalizeCustomType(content.customType);
    if (nextType && nextType !== content.customType) {
      if (!dryRun) {
        await CustomContent.updateOne({ _id: content._id }, { $set: { customType: nextType } });
      }
      updates += 1;
    }
  });
  await Promise.all(tasks);

  const progressUpdates = await LearnerProgress.find({ customType: { $in: ['practice', 'other'] } })
    .select('_id customType')
    .lean();
  await Promise.all(
    progressUpdates.map((progress) => {
      const nextType = normalizeCustomType(progress.customType);
      if (!nextType) return Promise.resolve();
      updates += 1;
      if (dryRun) return Promise.resolve();
      return LearnerProgress.updateOne({ _id: progress._id }, { $set: { customType: nextType } });
    })
  );

  const attemptUpdates = await ContentAttempt.find({ customType: { $in: ['practice', 'other'] } })
    .select('_id customType')
    .lean();
  await Promise.all(
    attemptUpdates.map((attempt) => {
      const nextType = normalizeCustomType(attempt.customType);
      if (!nextType) return Promise.resolve();
      updates += 1;
      if (dryRun) return Promise.resolve();
      return ContentAttempt.updateOne({ _id: attempt._id }, { $set: { customType: nextType } });
    })
  );

  return updates;
};

const resolvePublishedStatus = async (
  courseId: mongoose.Types.ObjectId
): Promise<'published' | 'rendered' | 'draft'> => {
  const rendered = await RenderedCourse.findOne({ courseId }).select('_id updatedAt').lean();
  if (!rendered) return 'draft';

  const courseContents = await CourseContent.find({ course: courseId, contentType: 'scorm' })
    .select('scormPackageId')
    .lean();
  const scormIds = courseContents
    .map((content) => content.scormPackageId)
    .filter(Boolean) as mongoose.Types.ObjectId[];
  if (scormIds.length === 0) return 'rendered';

  const publishedCount = await ScormPackage.countDocuments({
    _id: { $in: scormIds },
    isPublished: true,
  });
  return publishedCount > 0 ? 'published' : 'rendered';
};

const backfillCourseStatus = async (): Promise<number> => {
  const courses = await Course.find({}).select('_id status').lean();
  let updateCount = 0;
  for (const course of courses) {
    if (course.status) continue;
    const status = await resolvePublishedStatus(course._id);
    const updates: Record<string, any> = { status };
    if (status === 'published') {
      updates.publishedAt = new Date();
    }
    if (!dryRun) {
      await Course.updateOne({ _id: course._id }, { $set: updates });
    }
    updateCount += 1;
  }
  return updateCount;
};

const run = async (): Promise<void> => {
  const mongoUrl = resolveMongoUrl();
  await mongoose.connect(mongoUrl);

  const report = {
    programLevelUpdates: await backfillProgramLevelCourses(),
    programUpdates: await backfillProgramCourses(),
    customTypeUpdates: await migrateCustomContentTypes(),
    courseStatusUpdates: await backfillCourseStatus(),
  };

  await mongoose.disconnect();

  console.log('Migration summary');
  console.log(`ProgramLevel updates: ${report.programLevelUpdates}`);
  console.log(`Program updates: ${report.programUpdates}`);
  console.log(`CustomType updates: ${report.customTypeUpdates}`);
  console.log(`Course status updates: ${report.courseStatusUpdates}`);
  if (dryRun) {
    console.log('Dry-run mode: no updates applied.');
  }
};

run()
  .then(() => {
    console.log('✅ Course catalog migration complete');
  })
  .catch((err) => {
    console.error('❌ Course catalog migration failed');
    console.error(err);
    process.exitCode = 1;
  });
