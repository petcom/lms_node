import mongoose, { Schema } from 'mongoose';
import { IAcademicYear } from '../../types/models';

/**
 * Academic Year Schema
 * Represents academic years in the system
 */
const academicYearSchema = new Schema<IAcademicYear>(
  {
    name: {
      type: String,
      required: true,
    },
    fromYear: {
      type: Date,
      required: true,
    },
    toYear: {
      type: Date,
      required: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    learners: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Learner',
      },
    ],
    instructors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
academicYearSchema.index({ name: 1 }, { unique: true });
academicYearSchema.index({ isCurrent: 1 });
academicYearSchema.index({ fromYear: 1 });
academicYearSchema.index({ toYear: 1 });
academicYearSchema.index({ createdAt: -1 });
// Compound index for date range queries
academicYearSchema.index({ fromYear: 1, toYear: 1 });

// Model
const AcademicYear = mongoose.model<IAcademicYear>('AcademicYear', academicYearSchema);

export default AcademicYear;
