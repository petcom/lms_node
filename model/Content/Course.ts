import mongoose, { Schema } from 'mongoose';
import { ICourse } from '../../types/models-types';

/**
 * Course Schema
 * Represents a unit of completion within a program.
 * 
 * DCV-037: Removed redundant description field - use shortDescription/longDescription
 * DCV-044: Removed department field - inherit from Program via getDepartment()
 */
const courseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: true,
    },
    shortDescription: {
      type: String,
    },
    longDescription: {
      type: String,
    },
    // DCV-037: description removed - use shortDescription/longDescription
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    programLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramLevel',
      index: true,
    },
    // DCV-044: department removed - inherit from Program via getDepartment()
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'rendered', 'published'],
      default: 'draft',
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    primaryInstructors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
      },
    ],
    secondaryInstructors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
      },
    ],
    archivedAt: {
      type: Date,
    },
    // DCV-053: createdBy references User (shared _id pattern)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // DCV-035: Default grading policy for assessments in this course
    defaultGradingPolicy: {
      type: {
        type: String,
        enum: ['final-attempt', 'best-attempt', 'average-all', 'average-last-n'],
        default: 'final-attempt',
      },
      averageCount: Number, // Only used when type === 'average-last-n'
    },
  },
  { timestamps: true }
);

courseSchema.index({ program: 1, programLevel: 1 });
courseSchema.index({ isArchived: 1 });

// DCV-044: Method to get department from Program
courseSchema.methods.getDepartment = async function(): Promise<mongoose.Types.ObjectId | undefined> {
  const Program = mongoose.model('Program');
  const program = await Program.findById(this.program).select('department').lean() as { department?: mongoose.Types.ObjectId } | null;
  return program?.department;
};

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;
