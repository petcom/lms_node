import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import TokenBlacklist from '../../model/Auth/TokenBlacklist';
import {
  refreshAccessToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../../utils/tokenManager';

// Request body interfaces
interface LogoutRequestBody {
  refreshToken?: string;
}

interface RefreshTokenRequestBody {
  refreshToken: string;
}

interface JWTPayload {
  id: string;
  type?: string;
  role?: string;
  iat: number;
  exp: number;
}

/**
 * @desc    Logout user (blacklist current access token and revoke refresh token)
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, LogoutRequestBody>,
    res: Response
  ): Promise<void> => {
    const { refreshToken } = req.body;
    const accessToken = req.token; // From authentication middleware
    const user = req.userAuth;

    if (!user) {
      res.status(401).json({
        status: 'failed',
        message: 'User not authenticated',
      });
      return;
    }

    // Blacklist the access token
    if (accessToken) {
      await TokenBlacklist.blacklistToken(accessToken, user._id, req.userType || 'admin', 'logout');
    }

    // Revoke the refresh token
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  }
);

/**
 * @desc    Logout from all devices (revoke all tokens)
 * @route   POST /api/v1/auth/logout-all
 * @access  Private
 */
export const logoutAll = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = req.userAuth;

  if (!user) {
    res.status(401).json({
      status: 'failed',
      message: 'User not authenticated',
    });
    return;
  }

  // Blacklist all tokens for this user
  await TokenBlacklist.blacklistAllUserTokens(user._id, 'logout');

  // Revoke all refresh tokens
  await revokeAllUserTokens(user._id.toString());

  res.status(200).json({
    status: 'success',
    message: 'Logged out from all devices successfully',
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
export const refreshToken = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, RefreshTokenRequestBody>,
    res: Response
  ): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        status: 'failed',
        message: 'Refresh token is required',
      });
      return;
    }

    try {
      // Generate new token pair
      const tokens = await refreshAccessToken(refreshToken);

      res.status(200).json({
        status: 'success',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
        message: 'Token refreshed successfully',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Invalid or expired refresh token';
      res.status(401).json({
        status: 'failed',
        message: errorMessage,
      });
    }
  }
);

/**
 * @desc    Get current token info
 * @route   GET /api/v1/auth/token-info
 * @access  Private
 */
export const getTokenInfo = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = req.token;

  if (!token) {
    res.status(400).json({
      status: 'failed',
      message: 'No token provided',
    });
    return;
  }

  // Decode token to get expiry info
  const decoded = jwt.decode(token) as JWTPayload | null;

  if (!decoded) {
    res.status(400).json({
      status: 'failed',
      message: 'Invalid token',
    });
    return;
  }

  const role = req.userAuth?.role || decoded.role;

  res.status(200).json({
    status: 'success',
    data: {
      userId: decoded.id,
      role,
      issuedAt: decoded.iat ? new Date(decoded.iat * 1000) : null,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
      timeRemaining: decoded.exp ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) : null,
    },
  });
});
