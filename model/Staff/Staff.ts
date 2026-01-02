import mongoose, { Schema } from 'mongoose';
import { IStaff } from '../../types/models-types';

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
 * Staff Schema
 * Represents staff members in the LMS system
 */
const staffSchema = new Schema<IStaff>(
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
    // If withdrawn, the staff member will not be able to login
    isWithdrawn: {
      type: Boolean,
      default: false,
    },
    // If suspended, the staff member can login but cannot perform any task
    isSuspended: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: 'staff',
    },
    addresses: {
      type: [addressSchema],
      default: undefined,
    },
    honor: {
      type: honorSchema,
      default: undefined,
    },
    roles: {
      type: [String],
      default: [],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    // When you are registered, staff goes through approval stage
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
    },
    // An instructor can teach in more than one program level
    programLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramLevel',
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
    },
    examsCreated: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Exam',
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

// Indexes for query performance
staffSchema.index({ email: 1 }, { unique: true });
staffSchema.index({ instructorId: 1 }, { unique: true });
staffSchema.index({ course: 1 });
staffSchema.index({ programLevel: 1 });
staffSchema.index({ applicationStatus: 1 });
staffSchema.index({ isSuspended: 1 });
staffSchema.index({ isWithdrawn: 1 });
staffSchema.index({ createdAt: -1 });
// Compound indexes for common queries
staffSchema.index({ course: 1, programLevel: 1 });
staffSchema.index({ applicationStatus: 1, createdAt: -1 });

// Model
const Staff = mongoose.model<IStaff>('Staff', staffSchema);

export default Staff;
