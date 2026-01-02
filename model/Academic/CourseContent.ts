import mongoose, { Schema } from 'mongoose';
import { ICourseContent } from '../../types/models-types';

/**
 * Course Content Schema
 * Unifies SCORM and custom content under a course.
 */
const courseContentSchema = new Schema<ICourseContent>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['scorm', 'custom'],
      required: true,
      index: true,
    },
    scormPackageId: {
      type: Schema.Types.ObjectId,
      ref: 'ScormPackage',
    },
    customContentId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    isRequired: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

courseContentSchema.index({ course: 1, order: 1 }, { unique: true });
courseContentSchema.index({ course: 1, contentType: 1 });

const CourseContent = mongoose.model<ICourseContent>('CourseContent', courseContentSchema);

export default CourseContent;
