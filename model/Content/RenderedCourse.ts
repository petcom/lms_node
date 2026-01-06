import mongoose, { Schema } from 'mongoose';
import { IRenderedCourse } from '../../types/models-types';

/**
 * Rendered Course Schema
 * Stores pre-rendered course HTML/CSS for performance
 * DCV-048: Added css and version fields
 */
const renderedCourseSchema = new Schema<IRenderedCourse>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    contentVersion: {
      type: Date,
      required: true,
    },
    html: {
      type: String,
      required: true,
    },
    // DCV-048: CSS field for rendered styles
    css: {
      type: String,
    },
    // DCV-048: Numeric version for cache busting
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

const RenderedCourse = mongoose.model<IRenderedCourse>(
  'RenderedCourse',
  renderedCourseSchema
);

export default RenderedCourse;
