import mongoose, { Schema } from 'mongoose';
import { ILearnerProgress } from '../../types/models';

const learnerProgressSchema = new Schema<ILearnerProgress>(
  {
    learnerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      index: true,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    segmentId: {
      type: String,
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      required: true,
      enum: ['scorm', 'custom'],
      index: true,
    },
    customType: {
      type: String,
      enum: ['exam', 'quiz', 'practice', 'other'],
    },
    status: {
      type: String,
      required: true,
      enum: ['not_started', 'in_progress', 'completed', 'failed'],
      default: 'not_started',
    },
    progressPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    score: {
      type: Number,
      min: 0,
      default: 0,
    },
    maxScore: {
      type: Number,
      min: 0,
      default: 100,
    },
    passed: {
      type: Boolean,
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    timeSpentSec: {
      type: Number,
      default: 0,
    },
    lastActivityAt: {
      type: Date,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

learnerProgressSchema.index({ learnerId: 1, courseId: 1, contentId: 1 });

const LearnerProgress = mongoose.model<ILearnerProgress>(
  'LearnerProgress',
  learnerProgressSchema
);

export default LearnerProgress;
