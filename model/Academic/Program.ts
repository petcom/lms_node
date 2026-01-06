import mongoose, { Schema } from 'mongoose';
import { IProgram } from '../../types/models-types';

/**
 * Program Schema
 * Represents academic programs in the system
 */
const programSchema = new Schema<IProgram>(
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
      default: '4 years',
    },
    // Created automatically - CSFTY
    code: {
      type: String,
      default: function (this: IProgram) {
        return (
          this.name
            .split(' ')
            .map((name) => name[0])
            .join('')
            .toUpperCase() +
          Math.floor(10 + Math.random() * 90) +
          Math.floor(10 + Math.random() * 90)
        );
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    // DCV-013, DCV-014, DCV-015: Removed orphaned arrays
    // - learners: Derive from ProgramEnrollment.find({ program: programId })
    // - instructors: Derive from Course.primaryInstructors/secondaryInstructors via ProgramLevel
    // - courses: Derive from ProgramLevel.courses or Course.find({ program: programId })
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

const Program = mongoose.model<IProgram>('Program', programSchema);

export default Program;
