import mongoose, { Schema } from 'mongoose';
import { IUser } from '../../types/models-types';

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
    },
    username: {
      type: String,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['global-admin', 'staff', 'learner'],
      required: true,
    },
    subroles: {
      type: [String],
      default: undefined,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived', 'deleted'],
      default: 'active',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    passwordUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });

const User = mongoose.model<IUser>('User', userSchema);

export default User;
