import mongoose, { Schema } from 'mongoose';
import { ICourse } from '../../types/models-types';

/**
 * Course Schema
 * Represents a unit of completion within a program.
 * 
 * DCV-037: Removed redundant description field - use shortDescription/longDescription
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
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
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
courseSchema.index({ department: 1, isArchived: 1 });

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;
