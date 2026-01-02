import mongoose, { Schema } from 'mongoose';
import { ICourse } from '../../types/models-types';

/**
 * Course Schema
 * Represents a unit of completion within a program.
 */
const courseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
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

courseSchema.index({ program: 1, programLevel: 1 });
courseSchema.index({ department: 1, isArchived: 1 });

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;
