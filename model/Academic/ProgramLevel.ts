import mongoose, { Schema } from 'mongoose';
import { IProgramLevel } from '../../types/models-types';

/**
 * Program Level Schema
 * Represents a sub-program level within a program.
 * 
 * DCV-044: department removed - inherit from Program via getDepartment()
 */
const programLevelSchema = new Schema<IProgramLevel>(
  {
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    courses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    // DCV-044: department removed - inherit from Program via getDepartment()
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

programLevelSchema.index({ program: 1, order: 1 }, { unique: true });
programLevelSchema.index({ program: 1, archived: 1 });

// DCV-044: Method to get department from Program
programLevelSchema.methods.getDepartment = async function(): Promise<mongoose.Types.ObjectId | undefined> {
  const Program = mongoose.model('Program');
  const program = await Program.findById(this.program).select('department').lean();
  return program?.department;
};

const ProgramLevel = mongoose.model<IProgramLevel>('ProgramLevel', programLevelSchema);

export default ProgramLevel;
