import mongoose, { Schema } from 'mongoose';
import { IUser, UserRole } from '../../types/models-types';

const USER_ROLES: UserRole[] = ['global-admin', 'staff', 'learner'];

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
    // DCV-001: role -> roles array
    roles: {
      type: [
        {
          type: String,
          enum: USER_ROLES,
        },
      ],
      validate: {
        validator: function (v: string[]) {
          return v && v.length > 0;
        },
        message: 'User must have at least one role',
      },
    },
    // DCV-001: primaryRole determines default dashboard after login
    primaryRole: {
      type: String,
      enum: USER_ROLES,
    },
    // DCV-001: subroles -> staffRoles (permissions within staff role)
    staffRoles: {
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

// Pre-save hook: Set primaryRole from roles[0] if not provided
// Also validate primaryRole is in roles array
userSchema.pre('save', function (next) {
  if (this.roles && this.roles.length > 0) {
    // Auto-set primaryRole from first role if not explicitly set
    if (!this.primaryRole) {
      this.primaryRole = this.roles[0] as UserRole;
    }
    // Validate primaryRole is in roles array
    if (this.primaryRole && !this.roles.includes(this.primaryRole)) {
      const err = new Error(`primaryRole '${this.primaryRole}' must be in roles array`);
      return next(err);
    }
  }
  next();
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ roles: 1 }); // DCV-001: Changed from role to roles

const User = mongoose.model<IUser>('User', userSchema);

export default User;
