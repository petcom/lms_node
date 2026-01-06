import mongoose, { Schema } from 'mongoose';
import { ILearner } from '../../types/models-types';
import { requireUserExists } from '../../middlewares/personValidation';
import User from '../Auth/User';

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
 * 
 * DCV-041: Removed email field - derive from User via getEmail() method
 */
const learnerSchema = new Schema<ILearner>(
  {
    name: nameSchema,
    // DCV-041: email removed - derive from User via shared _id
    // Use learner.getEmail() to retrieve email from User collection
    dateAdmitted: {
      type: Date,
      default: Date.now,
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
    // DCV-029: programEnrolmentStatuses removed
    // Program enrollment status is now tracked in ProgramEnrollment model
    // with full status history and credential goal tracking
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
// DCV-041: email index removed - email now in User collection
learnerSchema.index({ learnerId: 1 }, { unique: true });
learnerSchema.index({ globalStatus: 1 });
learnerSchema.index({ createdAt: -1 });

// DCV-041: getEmail method - derives email from User via shared _id
learnerSchema.methods.getEmail = async function(): Promise<string | undefined> {
  const user = await User.findById(this._id).select('email');
  return user?.email;
};

// DCV-005: Apply User validation middleware
requireUserExists(learnerSchema);

// Model
const Learner = mongoose.model<ILearner>('Learner', learnerSchema);

export default Learner;
