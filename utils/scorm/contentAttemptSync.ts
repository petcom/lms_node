import mongoose from 'mongoose';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import CourseContent from '../../model/Academic/CourseContent';
import ContentAttempt from '../../model/Academic/ContentAttempt';

type SyncOptions = {
  attempt: typeof ScormAttempt.prototype;
};

const mapStatus = (status?: string): 'in_progress' | 'completed' | 'abandoned' => {
  if (!status) return 'in_progress';
  if (['completed', 'passed', 'failed'].includes(status)) return 'completed';
  if (status === 'suspended') return 'abandoned';
  return 'in_progress';
};

export const syncContentAttemptFromScorm = async ({ attempt }: SyncOptions): Promise<void> => {
  if (!attempt?.package || !attempt?.learner) {
    return;
  }

  const courseContent = await CourseContent.findOne({
    contentType: 'scorm',
    scormPackageId: attempt.package,
  })
    .select('_id')
    .lean();

  if (!courseContent) {
    return;
  }

  const score =
    typeof (attempt as any).scorePercentage === 'number'
      ? (attempt as any).scorePercentage
      : (attempt as any).cmi?.score?.raw;
  const maxScore = (attempt as any).cmi?.score?.max;

  await ContentAttempt.findOneAndUpdate(
    { scormAttemptId: (attempt as any)._id },
    {
      learner: (attempt as any).learner,
      courseContent: new mongoose.Types.ObjectId(courseContent._id.toString()),
      contentType: 'scorm',
      scormAttemptId: (attempt as any)._id,
      status: mapStatus((attempt as any).status),
      score: typeof score === 'number' ? score : undefined,
      maxScore: typeof maxScore === 'number' ? maxScore : undefined,
      passed: (attempt as any).status === 'passed',
      startedAt: (attempt as any).startedAt || new Date(),
      completedAt: (attempt as any).completedAt,
      payload: (attempt as any).cmi || {},
    },
    { upsert: true, new: true }
  );
};
