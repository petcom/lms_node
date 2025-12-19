const AsyncHandler = require("express-async-handler");
const TokenBlacklist = require("../../model/Auth/TokenBlacklist");
const { 
    generateTokenPair, 
    refreshAccessToken, 
    revokeRefreshToken,
    revokeAllUserTokens 
} = require("../../utils/tokenManager");

/**
 * @desc    Logout user (blacklist current access token and revoke refresh token)
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
exports.logout = AsyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const accessToken = req.token; // From authentication middleware
    const user = req.userAuth;

    // Blacklist the access token
    if (accessToken) {
        await TokenBlacklist.blacklistToken(
            accessToken,
            user._id,
            req.userType || 'admin',
            'logout'
        );
    }

    // Revoke the refresh token
    if (refreshToken) {
        await revokeRefreshToken(refreshToken);
    }

    res.status(200).json({
        status: "success",
        message: "Logged out successfully"
    });
});

/**
 * @desc    Logout from all devices (revoke all tokens)
 * @route   POST /api/v1/auth/logout-all
 * @access  Private
 */
exports.logoutAll = AsyncHandler(async (req, res) => {
    const user = req.userAuth;

    // Blacklist all tokens for this user
    await TokenBlacklist.blacklistAllUserTokens(user._id, 'logout');

    // Revoke all refresh tokens
    await revokeAllUserTokens(user._id);

    res.status(200).json({
        status: "success",
        message: "Logged out from all devices successfully"
    });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
exports.refreshToken = AsyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            status: 'failed',
            message: 'Refresh token is required'
        });
    }

    try {
        // Generate new token pair
        const tokens = await refreshAccessToken(refreshToken);

        res.status(200).json({
            status: "success",
            data: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.expiresIn
            },
            message: "Token refreshed successfully"
        });
    } catch (error) {
        return res.status(401).json({
            status: 'failed',
            message: error.message || 'Invalid or expired refresh token'
        });
    }
});

/**
 * @desc    Get current token info
 * @route   GET /api/v1/auth/token-info
 * @access  Private
 */
exports.getTokenInfo = AsyncHandler(async (req, res) => {
    const jwt = require('jsonwebtoken');
    const token = req.token;

    if (!token) {
        return res.status(400).json({
            status: 'failed',
            message: 'No token provided'
        });
    }

    // Decode token to get expiry info
    const decoded = jwt.decode(token);

    res.status(200).json({
        status: "success",
        data: {
            userId: decoded.id,
            userType: decoded.type,
            issuedAt: new Date(decoded.iat * 1000),
            expiresAt: new Date(decoded.exp * 1000),
            timeRemaining: Math.max(0, decoded.exp - Math.floor(Date.now() / 1000))
        }
    });
});

module.exports = {
    logout: exports.logout,
    logoutAll: exports.logoutAll,
    refreshToken: exports.refreshToken,
    getTokenInfo: exports.getTokenInfo
};
