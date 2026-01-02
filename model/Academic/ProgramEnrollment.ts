import mongoose, { Schema } from 'mongoose';
import { IProgramEnrollment } from '../../types/models-types';

/**
 * Program Enrollment Schema
 * Tracks learner enrollment and completion for a program.
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
    status: {
      type: String,
      enum: ['active', 'completed', 'withdrawn'],
      default: 'active',
      index: true,
    },
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
  },
  { timestamps: true }
);

programEnrollmentSchema.index({ learner: 1, program: 1 }, { unique: true });
programEnrollmentSchema.index({ program: 1, status: 1 });

const ProgramEnrollment = mongoose.model<IProgramEnrollment>(
  'ProgramEnrollment',
  programEnrollmentSchema
);

export default ProgramEnrollment;
