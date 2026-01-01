import mongoose, { Schema } from 'mongoose';
import { IAdmin } from '../../types/models';

/**
 * Admin Schema
 * Represents system administrators who manage the LMS
 */
const adminSchema = new Schema<IAdmin>(
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
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    role: {
      type: String,
      default: 'global-admin',
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
    classLevels: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ClassLevel',
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
adminSchema.index({ role: 1 });

// Model
const Admin = mongoose.model<IAdmin>('Admin', adminSchema);

export default Admin;
