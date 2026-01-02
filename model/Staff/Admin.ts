import mongoose, { Schema } from 'mongoose';
import { IAdmin } from '../../types/models-types';

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

/**
 * Admin Schema
 * Represents system administrators who manage the LMS
 */
const adminSchema = new Schema<IAdmin>(
  {
    name: nameSchema,
    email: {
      type: String,
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    addresses: {
      type: [addressSchema],
      default: undefined,
    },
    honor: {
      type: honorSchema,
      default: undefined,
    },
    academicTerms: [
      {
        type: Schema.Types.ObjectId,
        ref: 'AcademicTerm',
      },
    ],
    programs: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Program',
      },
    ],
    yearGroups: [
      {
        type: Schema.Types.ObjectId,
        ref: 'YearGroup',
      },
    ],
    academicYears: [
      {
        type: Schema.Types.ObjectId,
        ref: 'AcademicYear',
      },
    ],
    programLevels: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ProgramLevel',
      },
    ],
    courses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    instructors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
      },
    ],
    learners: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Learner',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
adminSchema.index({ email: 1 }, { unique: true });
adminSchema.index({ createdAt: -1 });

// Model
const Admin = mongoose.model<IAdmin>('Admin', adminSchema);

export default Admin;
