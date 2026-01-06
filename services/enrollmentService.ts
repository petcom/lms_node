/**
 * Enrollment Service
 * DCV-032: Provides course completion workflow (Current → Activity)
 * 
 * This service manages the enrollment lifecycle, particularly the transition
 * from active course enrollments (CourseEnrollmentCurrent) to completed
 * records (CourseEnrollmentActivity).
 */

import mongoose from 'mongoose';
import CourseEnrollmentCurrent from '../model/Academic/CourseEnrollmentCurrent';
import CourseEnrollmentActivity from '../model/Academic/CourseEnrollmentActivity';
import { ICourseEnrollmentActivity, ICourseEnrollmentCurrent, CourseOutcome } from '../types/models-types';

export interface CompletionOptions {
  creditsEarned?: number;
  finalScoring?: {
    totalPoints?: number;
    maxPoints?: number;
    percentage?: number;
    exams?: { points?: number; maxPoints?: number; percentage?: number };
    media?: { points?: number; maxPoints?: number; percentage?: number };
    scorm?: { points?: number; maxPoints?: number; scaledScore?: number };
  };
  withdrawalReason?: string;
  withdrawnBy?: mongoose.Types.ObjectId | string;
  notes?: string;
  visibleToLearner?: boolean;
}

export interface CompletionResult {
  activity: ICourseEnrollmentActivity;
  currentDeleted: boolean;
}

/**
 * Complete a course enrollment by moving it from Current to Activity
 * 
 * DCV-032: This is the main workflow function that:
 * 1. Retrieves the current enrollment
 * 2. Creates a new Activity record with final data
 * 3. Preserves the full attempt history
 * 4. Deletes the Current record
 * 
 * @param currentEnrollmentId - The _id of the CourseEnrollmentCurrent record
 * @param outcome - The final outcome: 'passed', 'failed', or 'withdrawn'
 * @param options - Additional completion data
 * @returns The created Activity record and confirmation of Current deletion
 */
export async function completeCourseEnrollment(
  currentEnrollmentId: string,
  outcome: CourseOutcome,
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  // Get the current enrollment
  const current = await CourseEnrollmentCurrent.findById(currentEnrollmentId);
  if (!current) {
    throw new Error(`CourseEnrollmentCurrent not found: ${currentEnrollmentId}`);
  }

  // Build the attempt history from current progress
  const attemptHistory = {
    examAttempts: current.progress?.examAttempts || [],
    mediaProgress: current.progress?.mediaProgress || [],
    scormAttempts: current.progress?.scormAttempts || [],
  };

  // Determine credits (only for passed)
  const creditsEarned = outcome === 'passed' ? (options.creditsEarned || 0) : 0;

  // Create the Activity record
  const activityData: Partial<ICourseEnrollmentActivity> = {
    learner: current.learner,
    course: current.course,
    programEnrollment: current.programEnrollment,
    outcome,
    enrolledAt: current.enrolledAt,
    completedAt: new Date(),
    attemptHistory,
    creditsEarned,
    visibleToLearner: options.visibleToLearner ?? true,
    notes: options.notes,
  };

  // Add finalScoring if provided
  if (options.finalScoring) {
    activityData.finalScoring = options.finalScoring;
  }

  // Add withdrawal details if applicable
  if (outcome === 'withdrawn') {
    activityData.withdrawalReason = options.withdrawalReason;
    if (options.withdrawnBy) {
      activityData.withdrawnBy = typeof options.withdrawnBy === 'string' 
        ? new mongoose.Types.ObjectId(options.withdrawnBy)
        : options.withdrawnBy;
    }
  }

  // Create activity record
  const activity = await CourseEnrollmentActivity.create(activityData);

  // Delete the current enrollment
  await CourseEnrollmentCurrent.findByIdAndDelete(currentEnrollmentId);

  return {
    activity,
    currentDeleted: true,
  };
}

/**
 * Start a new course enrollment
 * Creates a CourseEnrollmentCurrent record for active tracking
 * 
 * @param learnerId - The learner's _id
 * @param courseId - The course _id
 * @param programEnrollmentId - The program enrollment _id
 * @returns The created CourseEnrollmentCurrent record
 */
export async function startCourseEnrollment(
  learnerId: string | mongoose.Types.ObjectId,
  courseId: string | mongoose.Types.ObjectId,
  programEnrollmentId: string | mongoose.Types.ObjectId
): Promise<ICourseEnrollmentCurrent> {
  const current = await CourseEnrollmentCurrent.create({
    learner: learnerId,
    course: courseId,
    programEnrollment: programEnrollmentId,
    enrolledAt: new Date(),
    progress: {},
    lastActivityAt: new Date(),
  });

  return current;
}

/**
 * Get active course enrollments for a learner
 * 
 * @param learnerId - The learner's _id
 * @returns Array of active course enrollments
 */
export async function getActiveCourseEnrollments(
  learnerId: string | mongoose.Types.ObjectId
): Promise<ICourseEnrollmentCurrent[]> {
  return CourseEnrollmentCurrent.find({
    learner: learnerId,
  })
    .populate('course')
    .sort({ lastActivityAt: -1 });
}

/**
 * Get course enrollment history for a learner
 * 
 * @param learnerId - The learner's _id
 * @param visibleOnly - Only return records visible to learner
 * @returns Array of completed course enrollments
 */
export async function getCourseEnrollmentHistory(
  learnerId: string | mongoose.Types.ObjectId,
  visibleOnly = true
): Promise<ICourseEnrollmentActivity[]> {
  const query: any = { learner: learnerId };
  if (visibleOnly) {
    query.visibleToLearner = true;
  }

  return CourseEnrollmentActivity.find(query)
    .populate('course')
    .sort({ completedAt: -1 });
}

/**
 * Calculate total credits earned for a program enrollment
 * 
 * @param programEnrollmentId - The program enrollment _id
 * @returns Total credits earned from passed courses
 */
export async function getCreditsEarned(
  programEnrollmentId: string | mongoose.Types.ObjectId
): Promise<number> {
  const result = await CourseEnrollmentActivity.aggregate([
    {
      $match: {
        programEnrollment: new mongoose.Types.ObjectId(programEnrollmentId.toString()),
        outcome: 'passed',
      },
    },
    {
      $group: {
        _id: null,
        totalCredits: { $sum: '$creditsEarned' },
      },
    },
  ]);

  return result[0]?.totalCredits || 0;
}
