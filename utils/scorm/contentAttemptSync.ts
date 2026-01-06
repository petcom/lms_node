import CourseContent from '../../model/Academic/CourseContent';
import ContentAttempt from '../../model/Academic/ContentAttempt';
import ScormPackage from '../../model/Scorm/ScormPackage';
import { scormTimeToSeconds } from './cmiDataMapper';
import { ScormVersion } from '../../types/scorm-types';

const mapStatus = (status?: string) => {
  if (!status) return 'in_progress';
  if (['completed', 'passed', 'failed'].includes(status)) return 'completed';
  return 'in_progress';
};

const derivePassed = (status?: string, cmi?: any) => {
  if (status === 'passed') return true;
  if (status === 'failed') return false;
  const lessonStatus = cmi?.lesson_status || cmi?.core?.lesson_status;
  const successStatus = cmi?.success_status;
  if (lessonStatus === 'passed' || successStatus === 'passed') return true;
  if (lessonStatus === 'failed' || successStatus === 'failed') return false;
  return undefined;
};

const deriveScore = (cmi?: any) => {
  const scaled = cmi?.score?.scaled;
  if (scaled !== undefined && scaled !== null) {
    return Math.round((scaled + 1) * 50);
  }
  const raw = cmi?.score?.raw ?? cmi?.core?.score?.raw;
  return raw !== undefined && raw !== null ? raw : undefined;
};

const deriveMaxScore = (cmi?: any) => {
  const max = cmi?.score?.max ?? cmi?.core?.score?.max;
  return max !== undefined && max !== null ? max : undefined;
};

const deriveTimeSpent = (cmi?: any, version?: ScormVersion) => {
  const timeString = cmi?.total_time || cmi?.core?.total_time || '0';
  try {
    return scormTimeToSeconds(timeString, version || 'scorm_1.2');
  } catch (error) {
    return 0;
  }
};

export const syncContentAttemptFromScorm = async (attempt: any) => {
  const scormPackage = await ScormPackage.findById(attempt.package).lean();
  if (!scormPackage) return null;

  const courseContent = await CourseContent.findOne({
    scormPackageId: scormPackage._id,
    ...(scormPackage.course ? { course: scormPackage.course } : {}),
  }).lean();

  if (!courseContent) return null;

  const cmi = attempt.cmi || {};
  const score = deriveScore(cmi);
  const maxScore = deriveMaxScore(cmi);
  const passed = derivePassed(attempt.status, cmi);
  const timeSpentSec = deriveTimeSpent(cmi, scormPackage.version);

  const update = {
    learner: attempt.learner,
    courseContent: courseContent._id,
    contentType: 'scorm' as const,
    status: mapStatus(attempt.status),
    score,
    maxScore,
    passed,
    timeSpentSec,
    payload: {
      cmi,
    },
    startedAt: attempt.startedAt || new Date(),
    completedAt: attempt.completedAt || undefined,
  };

  return await ContentAttempt.findOneAndUpdate(
    { scormAttemptId: attempt._id },
    {
      $set: update,
      $setOnInsert: {
        scormAttemptId: attempt._id,
      },
    },
    { upsert: true, new: true }
  );
};
