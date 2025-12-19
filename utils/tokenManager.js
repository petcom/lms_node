const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const RefreshToken = require("../model/Auth/RefreshToken");

/**
 * Generate access and refresh tokens
 * @param {string} userId - User ID
 * @param {string} userType - Type of user (admin, teacher, student)
 * @param {object} deviceInfo - Optional device information
 * @returns {object} Object containing accessToken and refreshToken
 */
const generateTokenPair = async (userId, userType, deviceInfo = {}) => {
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
    const accessToken = jwt.sign(
        { 
            id: userId,
            type: userType 
        }, 
        secret, 
        { expiresIn: accessTokenExpiry }
    );
    
    // Generate refresh token (random string, not JWT)
    const refreshTokenString = crypto.randomBytes(64).toString('hex');
    
    // Calculate refresh token expiry
    const expiresAt = new Date();
    const expiryMatch = refreshTokenExpiry.match(/^(\d+)([smhd])$/);
    if (expiryMatch) {
        const value = parseInt(expiryMatch[1]);
        const unit = expiryMatch[2];
        const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
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
            ipAddress: deviceInfo.ipAddress
        }
    });
    
    return {
        accessToken,
        refreshToken: refreshTokenString,
        expiresIn: accessTokenExpiry
    };
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshTokenString - The refresh token
 * @returns {object} New access token and refresh token
 */
const refreshAccessToken = async (refreshTokenString) => {
    // Validate refresh token
    const refreshToken = await RefreshToken.validateToken(refreshTokenString);
    
    // Mark old refresh token as used
    await refreshToken.markAsUsed();
    
    // Generate new token pair (token rotation)
    const newTokenPair = await generateTokenPair(
        refreshToken.userId,
        refreshToken.userType,
        refreshToken.deviceInfo
    );
    
    return newTokenPair;
};

/**
 * Revoke refresh token (logout)
 * @param {string} refreshTokenString - The refresh token to revoke
 */
const revokeRefreshToken = async (refreshTokenString) => {
    const refreshToken = await RefreshToken.findOne({ token: refreshTokenString });
    
    if (refreshToken) {
        await refreshToken.revoke();
    }
};

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 */
const revokeAllUserTokens = async (userId) => {
    await RefreshToken.revokeAllUserTokens(userId);
};

module.exports = {
    generateTokenPair,
    refreshAccessToken,
    revokeRefreshToken,
    revokeAllUserTokens
};
