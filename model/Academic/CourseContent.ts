import mongoose, { Schema } from 'mongoose';
import { ICourseContent } from '../../types/models-types';

/**
 * Course Content Schema
 * Unifies SCORM and custom content under a course.
 * DCV-045: Added title field for segment naming
 */
const courseContentSchema = new Schema<ICourseContent>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    // DCV-045: Title field for content segment
    title: {
      type: String,
    },
    shortDescription: {
      type: String,
    },
    longDescription: {
      type: String,
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
      ref: 'CustomContent',
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
    // DCV-053: createdBy references User (shared _id pattern)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

courseContentSchema.index({ course: 1, order: 1 }, { unique: true });
courseContentSchema.index({ course: 1, contentType: 1 });

const CourseContent = mongoose.model<ICourseContent>('CourseContent', courseContentSchema);

export default CourseContent;
