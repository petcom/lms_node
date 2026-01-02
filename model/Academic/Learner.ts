import mongoose, { Schema } from 'mongoose';
import { ILearner } from '../../types/models';

const nameSchema = new Schema(
  {
    first: { type: String, required: true },
    middle: { type: String },
    last: { type: String, required: true },
    display: {
      type: String,
      default: function (this: { first?: string; middle?: string; last?: string }) {
        if (!this?.first || !this?.last) return '';
        const middleInitial = this.middle ? ` ${this.middle.trim()[0]?.toUpperCase()}.` : '';
        return `${this.last.trim()}, ${this.first.trim()}${middleInitial}`;
      },
    },
  },
  { _id: false }
);

const addressSchema = new Schema(
  {
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    region: { type: String },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    isPrimaryCorrespondence: { type: Boolean, default: false },
    isPrimaryBilling: { type: Boolean, default: false },
  },
  { _id: false }
);

const honorSchema = new Schema(
  {
    sex: { type: String },
    gender: { type: String },
    pronouns: { type: String },
    honorific: { type: String },
  },
  { _id: false }
);

const getNameInitials = (name: any) => {
  if (!name) return '';
  if (typeof name === 'string') {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  const parts = [name.first, name.middle, name.last].filter(Boolean);
  return parts
    .map((part) => String(part).trim())
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

/**
 * Learner Schema
 * Represents learners in the LMS system
 */
const learnerSchema = new Schema<ILearner>(
  {
    name: nameSchema,
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
        const initials = getNameInitials((this as any).name);
        return (
          'LRN' +
          Math.floor(100 + Math.random() * 900) +
          Date.now().toString().slice(2, 4) +
          initials
        );
      },
    },
    role: {
      type: String,
      default: 'learner',
    },
    addresses: {
      type: [addressSchema],
      default: undefined,
    },
    honor: {
      type: honorSchema,
      default: undefined,
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
