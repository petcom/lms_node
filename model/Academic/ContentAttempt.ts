import mongoose, { Schema } from 'mongoose';
import { IContentAttempt } from '../../types/models-types';

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
    scormAttemptId: {
      type: Schema.Types.ObjectId,
      ref: 'ScormAttempt',
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    maxScore: {
      type: Number,
      min: 0,
    },
    passed: {
      type: Boolean,
    },
    timeSpentSec: {
      type: Number,
      default: 0,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
    customType: {
      type: String,
      enum: ['exam', 'quiz', 'exercise', 'scorm', 'custom'],
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
contentAttemptSchema.index({ scormAttemptId: 1 }, { unique: true, sparse: true });

const ContentAttempt = mongoose.model<IContentAttempt>('ContentAttempt', contentAttemptSchema);

export default ContentAttempt;
