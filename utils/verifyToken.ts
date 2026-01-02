import jwt from 'jsonwebtoken';
import TokenBlacklistModel from '../model/Auth/TokenBlacklist';
import { JWTPayload } from '../types/auth-types';
import { ITokenBlacklistModel } from '../types/models-types';

// Type assertion for the model
const TokenBlacklist = TokenBlacklistModel as unknown as ITokenBlacklistModel;

/**
 * Verify a JWT token and check if it's blacklisted
 * @param token - The JWT token to verify
 * @returns Decoded token payload
 * @throws {Error} If token is invalid, expired, or blacklisted
 */
const verifyToken = async (token: string): Promise<JWTPayload> => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    // First verify the token signature and expiry
    const decoded = jwt.verify(token, secret) as JWTPayload;

    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    // Check if all user tokens are blacklisted
    if (decoded.id) {
      const userBlacklisted = await TokenBlacklist.findOne({
        token: `USER_${decoded.id}_ALL_TOKENS`,
      });
      if (userBlacklisted) {
        throw new Error('All user tokens have been revoked');
      }
    }

    return decoded;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
    }
    throw error;
  }
};

export default verifyToken;
