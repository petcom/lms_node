const bcrypt = require("bcryptjs");
const { validatePassword } = require("./passwordValidator");

/**
 * Hash password with validation
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 * @throws {Error} If password doesn't meet requirements
 */
exports.hashPassword = async (password) => {
    // Validate password strength
    const validation = validatePassword(password);
    
    if (!validation.isValid) {
        const error = new Error('Password does not meet security requirements');
        error.validationErrors = validation.errors;
        error.statusCode = 400;
        throw error;
    }
    
    // Create salt and hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
};

/**
 * Check if password matches hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
exports.isPassMatched = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};