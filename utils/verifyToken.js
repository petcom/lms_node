const jwt = require("jsonwebtoken");
const TokenBlacklist = require("../model/Auth/TokenBlacklist");

/**
 * Verify a JWT token and check if it's blacklisted
 * @param {string} token - The JWT token to verify
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid, expired, or blacklisted
 */
const verifyToken = async (token) => {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    
    try {
        // First verify the token signature and expiry
        const decoded = jwt.verify(token, secret);
        
        // Check if token is blacklisted
        const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
        if (isBlacklisted) {
            throw new Error('Token has been revoked');
        }
        
        // Check if all user tokens are blacklisted
        if (decoded.id) {
            const userBlacklisted = await TokenBlacklist.findOne({
                token: `USER_${decoded.id}_ALL_TOKENS`
            });
            if (userBlacklisted) {
                throw new Error('All user tokens have been revoked');
            }
        }
        
        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
};

module.exports = verifyToken;