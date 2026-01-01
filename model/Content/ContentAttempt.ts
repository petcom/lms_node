import mongoose, { Schema } from 'mongoose';
import { IContentAttempt } from '../../types/models';

const contentAttemptSchema = new Schema<IContentAttempt>(
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
    attemptNumber: {
      type: Number,
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      required: true,
      enum: ['in_progress', 'completed', 'failed'],
      default: 'in_progress',
    },
    score: {
      type: Number,
      min: 0,
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
  },
  { timestamps: true }
);

contentAttemptSchema.index({ learnerId: 1, contentId: 1, attemptNumber: 1 });

const ContentAttempt = mongoose.model<IContentAttempt>('ContentAttempt', contentAttemptSchema);

export default ContentAttempt;
