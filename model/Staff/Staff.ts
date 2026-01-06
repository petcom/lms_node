import mongoose, { Schema } from 'mongoose';
import { IStaff } from '../../types/models-types';
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

const membershipSchema = new Schema(
  {
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
    roles: {
      type: [String],
      default: [],
    },
  },
  { _id: false, timestamps: true }
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
 * Staff Schema
 * Represents staff members in the LMS system
 * 
 * DCV-021: email removed - derive from User via shared _id
 * DCV-022: department removed - use departmentMemberships
 * DCV-023: academicYear removed - context from Calendar/Class
 * DCV-040: isWithdrawn/isSuspended replaced with status enum
 */
const staffSchema = new Schema<IStaff>(
  {
    name: nameSchema,
    // DCV-021: email field removed - derive from User via shared _id
    // Use staff.getEmail() to retrieve email from User collection
    dateEmployed: {
      type: Date,
      default: Date.now,
    },
    // Randomizes a number between 1 and 999 to make the id unique for each staff member
    instructorId: {
      type: String,
      required: true,
      default: function (this: IStaff) {
        const initials = getNameInitials((this as any).name);
        return (
          'TEA' +
          Math.floor(100 + Math.random() * 900) +
          Date.now().toString().slice(2, 4) +
          initials
        );
      },
    },
    // DCV-040: Replaced isWithdrawn/isSuspended with status enum
    status: {
      type: String,
      enum: ['active', 'suspended', 'withdrawn'],
      default: 'active',
      index: true,
    },
    departmentMemberships: {
      type: [membershipSchema],
      default: undefined,
    },
    addresses: {
      type: [addressSchema],
      default: undefined,
    },
    honor: {
      type: honorSchema,
      default: undefined,
    },
    // DCV-022: department field removed - use departmentMemberships
    // DCV-023: academicYear field removed - context from Calendar/Class
    // DCV-036: course, program, programLevel, examsCreated removed - use CourseAssignment queries
    // When you are registered, staff goes through approval stage
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

// Indexes for query performance
// DCV-021: email index removed - email now in User collection
// DCV-036: course, programLevel indexes removed - fields removed
staffSchema.index({ instructorId: 1 }, { unique: true });
staffSchema.index({ applicationStatus: 1 });
staffSchema.index({ isSuspended: 1 });
staffSchema.index({ isWithdrawn: 1 });
staffSchema.index({ 'departmentMemberships.departmentId': 1 });
staffSchema.index({ createdAt: -1 });
// Compound indexes for common queries
staffSchema.index({ applicationStatus: 1, createdAt: -1 });

// DCV-021: getEmail method - derives email from User via shared _id
staffSchema.methods.getEmail = async function(): Promise<string | undefined> {
  const user = await User.findById(this._id).select('email');
  return user?.email;
};

// DCV-022: primaryDepartment virtual - first department membership
staffSchema.virtual('primaryDepartment').get(function() {
  return this.departmentMemberships?.[0]?.departmentId;
});

// DCV-022: getPrimaryDepartment method for explicit retrieval
staffSchema.methods.getPrimaryDepartment = function() {
  return this.departmentMemberships?.[0]?.departmentId;
};

// DCV-004: Apply User validation middleware
requireUserExists(staffSchema);

// Model
const Staff = mongoose.model<IStaff>('Staff', staffSchema);

export default Staff;
