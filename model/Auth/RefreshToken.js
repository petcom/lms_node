const mongoose = require("mongoose");

/**
 * Refresh Token Schema
 * Stores refresh tokens for token rotation strategy
 * Access tokens are short-lived, refresh tokens are longer-lived
 */
const refreshTokenSchema = new mongoose.Schema(
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
        expiresAt: {
            type: Date,
            required: true,
            index: true
        },
        isUsed: {
            type: Boolean,
            default: false
        },
        isRevoked: {
            type: Boolean,
            default: false
        },
        deviceInfo: {
            userAgent: String,
            ipAddress: String
        }
    },
    {
        timestamps: true
    }
);

// TTL index - automatically remove expired tokens after 7 days
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

// Method to validate refresh token
refreshTokenSchema.statics.validateToken = async function(token) {
    const refreshToken = await this.findOne({ token });
    
    if (!refreshToken) {
        throw new Error('Refresh token not found');
    }
    
    if (refreshToken.isUsed) {
        // Token reuse detected - possible security breach
        // Revoke all tokens for this user
        await this.updateMany(
            { userId: refreshToken.userId },
            { isRevoked: true }
        );
        throw new Error('Token reuse detected. All tokens have been revoked for security.');
    }
    
    if (refreshToken.isRevoked) {
        throw new Error('Refresh token has been revoked');
    }
    
    if (refreshToken.expiresAt < new Date()) {
        throw new Error('Refresh token has expired');
    }
    
    return refreshToken;
};

// Method to mark token as used
refreshTokenSchema.methods.markAsUsed = async function() {
    this.isUsed = true;
    await this.save();
};

// Method to revoke token
refreshTokenSchema.methods.revoke = async function() {
    this.isRevoked = true;
    await this.save();
};

// Method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllUserTokens = async function(userId) {
    return await this.updateMany(
        { userId },
        { isRevoked: true }
    );
};

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

module.exports = RefreshToken;
