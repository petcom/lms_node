import mongoose, { Schema } from 'mongoose';
import { ICourseEnrollmentCurrent } from '../../types/models-types';

/**
 * Exam Attempt Schema
 * Tracks individual exam attempts with scoring
 */
const examAttemptSchema = new Schema(
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
      default: Date.now,
    },
    timeSpent: {
      type: Number, // seconds
    },
  },
  { _id: false }
);

/**
 * Media Progress Schema
 * Tracks viewing progress for media content
 */
const mediaProgressSchema = new Schema(
  {
    mediaId: {
      type: Schema.Types.ObjectId,
      ref: 'Media',
      required: true,
    },
    viewedMinutes: {
      type: Number,
      default: 0,
    },
    requiredMinutes: {
      type: Number,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    lastViewedAt: {
      type: Date,
    },
  },
  { _id: false }
);

/**
 * SCORM Attempt Schema
 * Tracks SCORM package attempts with CMI data
 */
const scormAttemptSchema = new Schema(
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
      type: Number, // 0.0 to 1.0
    },
    completionStatus: {
      type: String,
      enum: ['unknown', 'not-attempted', 'incomplete', 'completed'],
      default: 'unknown',
    },
    successStatus: {
      type: String,
      enum: ['unknown', 'passed', 'failed'],
      default: 'unknown',
    },
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
    timeSpent: {
      type: Number, // seconds
    },
  },
  { _id: false }
);

/**
 * Progress Schema
 * Aggregates all progress types for a course enrollment
 */
const progressSchema = new Schema(
  {
    examAttempts: [examAttemptSchema],
    mediaProgress: [mediaProgressSchema],
    scormAttempts: [scormAttemptSchema],
  },
  { _id: false }
);

/**
 * Course Enrollment Current Schema
 * DCV-027: Tracks active course enrollments
 * 
 * This model holds the current state of a learner's course enrollment.
 * When a course is completed or withdrawn, this record is moved to
 * CourseEnrollmentActivity and deleted from this collection.
 * 
 * Key Features:
 * - Tracks in-progress work (exam attempts, media views, SCORM progress)
 * - Links to ProgramEnrollment for credential tracking
 * - Temporary record - deleted when course ends
 */
const courseEnrollmentCurrentSchema = new Schema<ICourseEnrollmentCurrent>(
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
    // When the course enrollment started
    enrolledAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // All progress tracking
    progress: {
      type: progressSchema,
      default: () => ({}),
    },
    // Last activity timestamp for sorting/filtering
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Unique constraint: one active enrollment per learner-course pair
courseEnrollmentCurrentSchema.index({ learner: 1, course: 1 }, { unique: true });
// Query enrollments by program enrollment (for credential progress)
courseEnrollmentCurrentSchema.index({ programEnrollment: 1 });
// Find active courses by learner
courseEnrollmentCurrentSchema.index({ learner: 1, lastActivityAt: -1 });

const CourseEnrollmentCurrent = mongoose.model<ICourseEnrollmentCurrent>(
  'CourseEnrollmentCurrent',
  courseEnrollmentCurrentSchema
);

export default CourseEnrollmentCurrent;
