import mongoose, { Schema } from 'mongoose';
import { IProgramEnrollment } from '../../types/models-types';

/**
 * Status History Entry Schema
 * DCV-026: Tracks all status changes for audit trail
 */
const statusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: ['applied', 'enrolled', 'on-leave', 'withdrawn', 'completed'],
      required: true,
    },
    reason: {
      type: String,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Program Enrollment Schema
 * DCV-026: Redesigned to track learner enrollment lifecycle with credential goals
 * 
 * Key Changes:
 * - credentialGoal: What the learner is working toward (certificate, degree, none)
 * - targetCredential: Reference to specific Credential being pursued
 * - currentProgramLevel: Which level the learner is currently in
 * - Expanded status enum: applied, enrolled, on-leave, withdrawn, completed
 * - statusHistory: Full audit trail of status changes
 * - Leave tracking: leaveReason, leaveStartDate, expectedReturnDate
 * - Completion details: completionType, withdrawalReason, withdrawnBy
 */
const programEnrollmentSchema = new Schema<IProgramEnrollment>(
  {
    learner: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: true,
      index: true,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    // DCV-026: What credential goal is the learner pursuing?
    credentialGoal: {
      type: String,
      enum: ['certificate', 'degree', 'none'],
      default: 'none',
    },
    // DCV-026: Reference to specific Credential if pursuing one
    targetCredential: {
      type: Schema.Types.ObjectId,
      ref: 'Credential',
    },
    // DCV-026: Current program level (null for single-course learners)
    currentProgramLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramLevel',
    },
    // DCV-026: Expanded status with additional lifecycle states
    status: {
      type: String,
      enum: ['applied', 'enrolled', 'on-leave', 'withdrawn', 'completed'],
      default: 'applied',
      index: true,
    },
    // DCV-026: Full status history for audit trail
    statusHistory: [statusHistorySchema],
    // Enrollment dates
    enrolledAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    withdrawnAt: {
      type: Date,
    },
    // DCV-026: Leave tracking
    leaveReason: {
      type: String,
    },
    leaveStartDate: {
      type: Date,
    },
    expectedReturnDate: {
      type: Date,
    },
    // DCV-026: Completion/withdrawal details
    completionType: {
      type: String,
      enum: ['with-certificate', 'with-degree', 'coursework-only', 'incomplete'],
    },
    withdrawalReason: {
      type: String,
    },
    withdrawnBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

programEnrollmentSchema.index({ learner: 1, program: 1 }, { unique: true });
programEnrollmentSchema.index({ program: 1, status: 1 });
programEnrollmentSchema.index({ learner: 1, status: 1 });
programEnrollmentSchema.index({ credentialGoal: 1, targetCredential: 1 });

const ProgramEnrollment = mongoose.model<IProgramEnrollment>(
  'ProgramEnrollment',
  programEnrollmentSchema
);

export default ProgramEnrollment;
