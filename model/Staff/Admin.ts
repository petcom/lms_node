import mongoose, { Schema } from 'mongoose';
import { IAdmin } from '../../types/models-types';
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

/**
 * Admin Schema
 * Represents system administrators who manage the LMS
 * 
 * DCV-016: Removed orphaned arrays (programs, academicTerms, yearGroups, academicYears,
 * programLevels, courses, instructors, learners). Global admins access all resources
 * via their role, not through explicit array membership.
 * 
 * DCV-039: Removed email field - derive from User via getEmail() method
 */
const adminSchema = new Schema<IAdmin>(
  {
    name: nameSchema,
    // DCV-039: email removed - derive from User via shared _id
    // Use admin.getEmail() to retrieve email from User collection
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
    // DCV-016: Removed orphaned arrays:
    // - academicTerms, programs, yearGroups, academicYears, programLevels,
    //   courses, instructors, learners
    // Global admins access all resources via role-based authorization
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
// DCV-039: email index removed - email now in User collection
adminSchema.index({ createdAt: -1 });

// DCV-039: getEmail method - derives email from User via shared _id
adminSchema.methods.getEmail = async function(): Promise<string | undefined> {
  const user = await User.findById(this._id).select('email');
  return user?.email;
};

// DCV-003: Apply User validation middleware
requireUserExists(adminSchema);

// Model
const Admin = mongoose.model<IAdmin>('Admin', adminSchema);

export default Admin;
