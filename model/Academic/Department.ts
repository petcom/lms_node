import mongoose, { Schema } from 'mongoose';
import { IDepartment } from '../../types/models-types';

/**
 * Department Schema
 * DCV-042: Added status field ['active', 'archived']
 */
const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
    },
    level: {
      type: String,
      required: true,
      enum: ['master', 'top', 'sub'],
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    ancestors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    passingStyleScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    // DCV-042: Status enum for department lifecycle
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

departmentSchema.index({ level: 1 });
departmentSchema.index({ parent: 1 });
departmentSchema.index({ name: 1, parent: 1 }, { unique: true });

const Department = mongoose.model<IDepartment>('Department', departmentSchema);

export default Department;
