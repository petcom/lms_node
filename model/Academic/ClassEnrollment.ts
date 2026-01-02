import mongoose, { Schema } from 'mongoose';
import { IClassEnrollment } from '../../types/models-types';

/**
 * Class Enrollment Schema
 * Tracks learner enrollment within a class cohort.
 */
const classEnrollmentSchema = new Schema<IClassEnrollment>(
  {
    learner: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: true,
      index: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    programLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramLevel',
      required: true,
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

classEnrollmentSchema.index({ learner: 1, class: 1 }, { unique: true });
classEnrollmentSchema.index({ class: 1, createdAt: -1 });

const ClassEnrollment = mongoose.model<IClassEnrollment>(
  'ClassEnrollment',
  classEnrollmentSchema
);

export default ClassEnrollment;
