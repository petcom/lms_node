const mongoose = require("mongoose");

/**
 * Token Blacklist Schema
 * Used to invalidate JWT tokens before their natural expiry
 * Common use cases: logout, password reset, account suspension
 */
const tokenBlacklistSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },
        userType: {
            type: String,
            required: true,
            enum: ['admin', 'teacher', 'student']
        },
        reason: {
            type: String,
            enum: ['logout', 'password_change', 'token_refresh', 'security_breach', 'manual_revocation'],
            default: 'logout'
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

// TTL index - automatically remove documents after they expire
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if a token is blacklisted
tokenBlacklistSchema.statics.isBlacklisted = async function(token) {
    const blacklisted = await this.findOne({ token });
    return !!blacklisted;
};

// Method to blacklist a token
tokenBlacklistSchema.statics.blacklistToken = async function(token, userId, userType, reason = 'logout') {
    const jwt = require('jsonwebtoken');
    
    try {
        // Decode token to get expiry time (don't verify, just decode)
        const decoded = jwt.decode(token);
        
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
            expiresAt
        });
    } catch (error) {
        if (error.code === 11000) {
            // Token already blacklisted
            return null;
        }
        throw error;
    }
};

// Method to blacklist all tokens for a user
tokenBlacklistSchema.statics.blacklistAllUserTokens = async function(userId, reason = 'security_breach') {
    // This creates a special entry that will be checked during token verification
    return await this.create({
        token: `USER_${userId}_ALL_TOKENS`,
        userId,
        userType: 'all',
        reason,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    });
};

const TokenBlacklist = mongoose.model("TokenBlacklist", tokenBlacklistSchema);

module.exports = TokenBlacklist;
