import mongoose, { Schema } from 'mongoose';
import { IStaffRole } from '../../types/models-types';

/**
 * Staff Role Schema
 * Stores allowed staff roles for validation.
 */
const staffRoleSchema = new Schema<IStaffRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

staffRoleSchema.index({ name: 1 }, { unique: true });

const StaffRole = mongoose.model<IStaffRole>('StaffRole', staffRoleSchema);

export default StaffRole;
