import mongoose, { Schema } from 'mongoose';
import { IContentAttempt } from '../../types/models';

/**
 * Content Attempt Schema
 * Unifies attempts across SCORM and custom content.
 */
const contentAttemptSchema = new Schema<IContentAttempt>(
  {
    learner: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: true,
      index: true,
    },
    courseContent: {
      type: Schema.Types.ObjectId,
      ref: 'CourseContent',
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      enum: ['scorm', 'custom'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
      index: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

contentAttemptSchema.index({ learner: 1, courseContent: 1, startedAt: -1 });
contentAttemptSchema.index({ courseContent: 1, status: 1 });

const ContentAttempt = mongoose.model<IContentAttempt>('ContentAttempt', contentAttemptSchema);

export default ContentAttempt;
