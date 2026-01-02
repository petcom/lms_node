import mongoose, { Schema } from 'mongoose';
import { IAcademicTerm } from '../../types/models-types';

/**
 * Academic Term Schema
 * Represents academic terms (semesters) in the system
 */
const academicTermSchema = new Schema<IAcademicTerm>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
      required: true,
      default: '3 months',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const AcademicTerm = mongoose.model<IAcademicTerm>('AcademicTerm', academicTermSchema);

export default AcademicTerm;
