import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshTokenModel from '../model/Auth/RefreshToken';
import { TokenPair, UserRole } from '../types/auth';
import { IRefreshTokenModel } from '../types/models';

// Type assertion for the model
const RefreshToken = RefreshTokenModel as unknown as IRefreshTokenModel;

/**
 * Device information for tracking refresh tokens
 */
interface DeviceInfo {
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Generate access and refresh tokens
 * @param userId - User ID
 * @param userType - Type of user (global-admin, staff, learner)
 * @param deviceInfo - Optional device information
 * @returns Object containing accessToken and refreshToken
 */
export const generateTokenPair = async (
  userId: string,
  userType: UserRole,
  deviceInfo: DeviceInfo = {}
): Promise<TokenPair> => {
  const secret = process.env.JWT_SECRET;
  const accessTokenExpiry = process.env.JWT_EXPIRY || '15m'; // Short-lived access token
  const refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d'; // Long-lived refresh token

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Generate access token
  const accessToken = jwt.sign({ id: userId, type: userType }, secret, {
    expiresIn: accessTokenExpiry,
  } as jwt.SignOptions) as string;

  // Generate refresh token (random string, not JWT)
  const refreshTokenString = crypto.randomBytes(64).toString('hex');

  // Calculate refresh token expiry
  const expiresAt = new Date();
  const expiryMatch = refreshTokenExpiry.match(/^(\d+)([smhd])$/);
  if (expiryMatch) {
    const value = parseInt(expiryMatch[1], 10);
    const unit = expiryMatch[2] as 's' | 'm' | 'h' | 'd';
    const multipliers: Record<'s' | 'm' | 'h' | 'd', number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };
    expiresAt.setTime(expiresAt.getTime() + value * multipliers[unit]);
  } else {
    // Default to 7 days
    expiresAt.setDate(expiresAt.getDate() + 7);
  }

  // Store refresh token in database
  await RefreshToken.create({
    token: refreshTokenString,
    userId,
    userType,
    expiresAt,
    deviceInfo: {
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ipAddress,
    },
  });

  return {
    accessToken,
    refreshToken: refreshTokenString,
    expiresIn: accessTokenExpiry,
  };
};

/**
 * Refresh access token using refresh token
 * @param refreshTokenString - The refresh token
 * @returns New access token and refresh token
 */
export const refreshAccessToken = async (refreshTokenString: string): Promise<TokenPair> => {
  // Validate refresh token
  const refreshToken = await RefreshToken.validateToken(refreshTokenString);

  // Mark old refresh token as used
  await refreshToken.markAsUsed();

  // Generate new token pair (token rotation)
  const newTokenPair = await generateTokenPair(
    refreshToken.userId.toString(),
    refreshToken.userType,
    refreshToken.deviceInfo
  );

  return newTokenPair;
};

/**
 * Revoke refresh token (logout)
 * @param refreshTokenString - The refresh token to revoke
 */
export const revokeRefreshToken = async (refreshTokenString: string): Promise<void> => {
  const refreshToken = await RefreshToken.findOne({ token: refreshTokenString });

  if (refreshToken) {
    await refreshToken.revoke();
  }
};

/**
 * Revoke all refresh tokens for a user
 * @param userId - User ID
 */
export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  await RefreshToken.revokeAllUserTokens(userId);
};
