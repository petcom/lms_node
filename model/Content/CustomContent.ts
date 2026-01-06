import mongoose, { Schema } from 'mongoose';
import { ICustomContent } from '../../types/models-types';

/**
 * Custom Content Schema
 * DCV-046: Removed 'scorm' from customType enum (use CourseContent.scormPackageId instead)
 * DCV-047: Added questions ref for quiz/exam types
 */
const customContentSchema = new Schema<ICustomContent>(
  {
    title: {
      type: String,
      required: true,
    },
    // DCV-046: 'scorm' removed - use CourseContent.scormPackageId for SCORM content
    customType: {
      type: String,
      required: true,
      enum: ['exam', 'quiz', 'exercise', 'custom'],
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
    html: {
      type: String,
    },
    css: {
      type: String,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    // DCV-047: Questions ref for quiz/exam types
    questions: [{
      type: Schema.Types.ObjectId,
      ref: 'Question',
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

customContentSchema.index({ title: 1 });

const CustomContent = mongoose.model<ICustomContent>('CustomContent', customContentSchema);

export default CustomContent;
