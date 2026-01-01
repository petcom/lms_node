import mongoose, { Schema } from 'mongoose';
import { ILearner } from '../../types/models';

/**
 * Learner Schema
 * Represents learners in the LMS system
 */
const learnerSchema = new Schema<ILearner>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    learnerId: {
      type: String,
      required: true,
      default: function (this: ILearner) {
        return (
          'LRN' +
          Math.floor(100 + Math.random() * 900) +
          Date.now().toString().slice(2, 4) +
          this.name
            .split(' ')
            .map((name) => name[0])
            .join('')
            .toUpperCase()
        );
      },
    },
    role: {
      type: String,
      default: 'learner',
    },
    globalStatus: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    isWithdrawn: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
learnerSchema.index({ email: 1 }, { unique: true });
learnerSchema.index({ learnerId: 1 }, { unique: true });
learnerSchema.index({ globalStatus: 1 });
learnerSchema.index({ isSuspended: 1 });
learnerSchema.index({ createdAt: -1 });

// Model
const Learner = mongoose.model<ILearner>('Learner', learnerSchema);

export default Learner;
