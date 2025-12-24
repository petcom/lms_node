import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import { ITokenBlacklist, ITokenBlacklistModel } from '../../types/models';

/**
 * Token Blacklist Schema
 * Used to invalidate JWT tokens before their natural expiry
 * Common use cases: logout, password reset, account suspension
 */
const tokenBlacklistSchema = new Schema<ITokenBlacklist, ITokenBlacklistModel>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userType: {
      type: String,
      required: true,
      enum: ['admin', 'teacher', 'student'],
    },
    reason: {
      type: String,
      enum: ['logout', 'password_change', 'token_refresh', 'security_breach', 'manual_revocation'],
      default: 'logout',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index - automatically remove documents after they expire
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to check if a token is blacklisted
tokenBlacklistSchema.statics.isBlacklisted = async function (
  this: ITokenBlacklistModel,
  token: string
): Promise<boolean> {
  const blacklisted = await this.findOne({ token });
  return !!blacklisted;
};

// Static method to blacklist a token
tokenBlacklistSchema.statics.blacklistToken = async function (
  this: ITokenBlacklistModel,
  token: string,
  userId: string,
  userType: 'admin' | 'teacher' | 'student',
  reason: 'logout' | 'password_change' | 'token_refresh' | 'security_breach' | 'manual_revocation' = 'logout'
): Promise<ITokenBlacklist | null> {
  try {
    // Decode token to get expiry time (don't verify, just decode)
    const decoded = jwt.decode(token) as { exp?: number } | null;

    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token format');
    }

    // Convert JWT exp (seconds) to Date object
    const expiresAt = new Date(decoded.exp * 1000);

    // Don't blacklist if already expired
    if (expiresAt < new Date()) {
      return null;
    }

    // Create blacklist entry
    return await this.create({
      token,
      userId,
      userType,
      reason,
      expiresAt,
    });
  } catch (error) {
    if ((error as any).code === 11000) {
      // Token already blacklisted
      return null;
    }
    throw error;
  }
};

// Static method to blacklist all tokens for a user
tokenBlacklistSchema.statics.blacklistAllUserTokens = async function (
  this: ITokenBlacklistModel,
  userId: string,
  reason: 'logout' | 'password_change' | 'token_refresh' | 'security_breach' | 'manual_revocation' = 'security_breach'
): Promise<ITokenBlacklist> {
  // This creates a special entry that will be checked during token verification
  return await this.create({
    token: `USER_${userId}_ALL_TOKENS`,
    userId,
    userType: 'admin', // placeholder, will match any user type
    reason,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  });
};

const TokenBlacklist: ITokenBlacklistModel = mongoose.model<ITokenBlacklist, ITokenBlacklistModel>(
  'TokenBlacklist',
  tokenBlacklistSchema
);

export default TokenBlacklist;
