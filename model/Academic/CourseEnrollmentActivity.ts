import mongoose, { Schema } from 'mongoose';
import { ICourseEnrollmentActivity } from '../../types/models-types';

/**
 * Exam Attempt History Schema
 * Preserves all exam attempts from the active enrollment
 */
const examAttemptHistorySchema = new Schema(
  {
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    examType: {
      type: String,
      enum: ['quiz', 'midterm', 'final', 'assignment', 'practice'],
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    points: {
      type: Number,
    },
    maxPoints: {
      type: Number,
    },
    percentage: {
      type: Number,
    },
    attemptedAt: {
      type: Date,
    },
    timeSpent: {
      type: Number, // seconds
    },
  },
  { _id: false }
);

/**
 * Media Progress History Schema
 * Preserves final media viewing state
 */
const mediaProgressHistorySchema = new Schema(
  {
    mediaId: {
      type: Schema.Types.ObjectId,
      ref: 'Media',
      required: true,
    },
    viewedMinutes: {
      type: Number,
    },
    requiredMinutes: {
      type: Number,
    },
    verified: {
      type: Boolean,
    },
    completedAt: {
      type: Date,
    },
  },
  { _id: false }
);

/**
 * SCORM Attempt History Schema
 * Preserves SCORM attempt history
 */
const scormAttemptHistorySchema = new Schema(
  {
    scormPackageId: {
      type: Schema.Types.ObjectId,
      ref: 'ScormPackage',
      required: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    score: {
      type: Number,
    },
    scaledScore: {
      type: Number,
    },
    completionStatus: {
      type: String,
      enum: ['unknown', 'not-attempted', 'incomplete', 'completed'],
    },
    successStatus: {
      type: String,
      enum: ['unknown', 'passed', 'failed'],
    },
    attemptedAt: {
      type: Date,
    },
    timeSpent: {
      type: Number,
    },
  },
  { _id: false }
);

/**
 * Attempt History Schema
 * Full history of all attempts from the active enrollment
 */
const attemptHistorySchema = new Schema(
  {
    examAttempts: [examAttemptHistorySchema],
    mediaProgress: [mediaProgressHistorySchema],
    scormAttempts: [scormAttemptHistorySchema],
  },
  { _id: false }
);

/**
 * Scoring Breakdown Schema
 * Component scoring for exams, media, scorm
 */
const scoringBreakdownSchema = new Schema(
  {
    points: {
      type: Number,
    },
    maxPoints: {
      type: Number,
    },
    percentage: {
      type: Number,
    },
    scaledScore: {
      type: Number,
    },
  },
  { _id: false }
);

/**
 * Final Scoring Schema
 * Overall scoring with breakdown by component type
 */
const finalScoringSchema = new Schema(
  {
    totalPoints: {
      type: Number,
    },
    maxPoints: {
      type: Number,
    },
    percentage: {
      type: Number,
    },
    exams: scoringBreakdownSchema,
    media: scoringBreakdownSchema,
    scorm: scoringBreakdownSchema,
  },
  { _id: false }
);

/**
 * Course Enrollment Activity Schema
 * DCV-028: Permanent record of completed/withdrawn course enrollments
 * 
 * This model stores the final state and history of a course enrollment
 * after it has ended (passed, failed, or withdrawn). Records are created
 * by moving data from CourseEnrollmentCurrent when a course ends.
 * 
 * Key Features:
 * - Permanent audit log (never deleted)
 * - Preserves full attempt history
 * - Final scoring breakdown
 * - Credits earned for credential tracking
 * - Visibility control for learner view
 */
const courseEnrollmentActivitySchema = new Schema<ICourseEnrollmentActivity>(
  {
    learner: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    // Links to program enrollment for credential tracking
    programEnrollment: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramEnrollment',
      required: true,
    },
    // Final outcome of the course
    outcome: {
      type: String,
      enum: ['passed', 'failed', 'withdrawn'],
      required: true,
    },
    // When the enrollment started and ended
    enrolledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    // Final scoring with breakdown
    finalScoring: finalScoringSchema,
    // Complete attempt history from Current
    attemptHistory: attemptHistorySchema,
    // Credits earned (if passed)
    creditsEarned: {
      type: Number,
      default: 0,
    },
    // Whether this appears in learner's transcript/history
    visibleToLearner: {
      type: Boolean,
      default: true,
    },
    // Withdrawal details (if withdrawn)
    withdrawalReason: {
      type: String,
    },
    withdrawnBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    // Notes from instructor/admin
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Query by learner and outcome
courseEnrollmentActivitySchema.index({ learner: 1, outcome: 1 });
// Query by program enrollment (for credential progress)
courseEnrollmentActivitySchema.index({ programEnrollment: 1 });
// Query by course (for analytics)
courseEnrollmentActivitySchema.index({ course: 1, outcome: 1 });
// Find visible records for learner transcript
courseEnrollmentActivitySchema.index({ learner: 1, visibleToLearner: 1, completedAt: -1 });

const CourseEnrollmentActivity = mongoose.model<ICourseEnrollmentActivity>(
  'CourseEnrollmentActivity',
  courseEnrollmentActivitySchema
);

export default CourseEnrollmentActivity;
