const AsyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Admin = require("../model/Staff/Admin");
const Teacher = require("../model/Staff/Teacher");
const Student = require("../model/Academic/Student");
const { hashPassword, isPassMatched } = require("../utils/helpers");
const { validatePasswordConfirmation } = require("../utils/passwordValidator");
const TokenBlacklist = require("../model/Auth/TokenBlacklist");

// Password reset token storage (in production, use Redis or database)
const passwordResetTokens = new Map();

/**
 * @desc    Change password (requires old password)
 * @route   PUT /api/v1/password/change
 * @access  Private
 */
exports.changePassword = AsyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.userAuth._id;
    
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
            status: 'failed',
            message: 'Old password, new password, and confirmation are required'
        });
    }

    // Validate password confirmation
    const confirmValidation = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
        return res.status(400).json({
            status: 'failed',
            message: 'Password confirmation failed',
            errors: confirmValidation.errors
        });
    }

    // Find user (check all collections)
    let user = await Admin.findById(userId);
    let UserModel = Admin;
    let userType = 'admin';

    if (!user) {
        user = await Teacher.findById(userId);
        UserModel = Teacher;
        userType = 'teacher';
    }

    if (!user) {
        user = await Student.findById(userId);
        UserModel = Student;
        userType = 'student';
    }

    if (!user) {
        return res.status(404).json({
            status: 'failed',
            message: 'User not found'
        });
    }

    // Verify old password
    const isOldPasswordCorrect = await isPassMatched(oldPassword, user.password);
    if (!isOldPasswordCorrect) {
        return res.status(401).json({
            status: 'failed',
            message: 'Old password is incorrect'
        });
    }

    // Check if new password is same as old password
    const isSamePassword = await isPassMatched(newPassword, user.password);
    if (isSamePassword) {
        return res.status(400).json({
            status: 'failed',
            message: 'New password must be different from old password'
        });
    }

    try {
        // Hash new password (validation happens inside hashPassword)
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        user.password = hashedPassword;
        await user.save();

        // Blacklist all existing tokens (force re-login)
        await TokenBlacklist.blacklistAllUserTokens(userId, 'password_change');

        res.status(200).json({
            status: 'success',
            message: 'Password changed successfully. Please login with your new password.'
        });
    } catch (error) {
        if (error.validationErrors) {
            return res.status(400).json({
                status: 'failed',
                message: 'Password validation failed',
                errors: error.validationErrors
            });
        }
        throw error;
    }
});

/**
 * @desc    Request password reset (generates reset token)
 * @route   POST /api/v1/password/forgot
 * @access  Public
 */
exports.forgotPassword = AsyncHandler(async (req, res) => {
    const { email, userType } = req.body;

    if (!email || !userType) {
        return res.status(400).json({
            status: 'failed',
            message: 'Email and user type are required'
        });
    }

    // Find user based on type
    let user;
    let UserModel;

    switch (userType) {
        case 'admin':
            user = await Admin.findOne({ email });
            UserModel = Admin;
            break;
        case 'teacher':
            user = await Teacher.findOne({ email });
            UserModel = Teacher;
            break;
        case 'student':
            user = await Student.findOne({ email });
            UserModel = Student;
            break;
        default:
            return res.status(400).json({
                status: 'failed',
                message: 'Invalid user type. Must be: admin, teacher, or student'
            });
    }

    if (!user) {
        // Security: Don't reveal if email exists
        return res.status(200).json({
            status: 'success',
            message: 'If the email exists, a password reset link has been sent'
        });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store token with expiry (15 minutes)
    const expiresAt = Date.now() + 15 * 60 * 1000;
    passwordResetTokens.set(resetTokenHash, {
        userId: user._id,
        userType,
        expiresAt
    });

    // In production, send email with reset link
    // For now, return token (in production, NEVER return token in response)
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`;

    // TODO: Send email with resetUrl
    // await sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json({
        status: 'success',
        message: 'Password reset link has been sent to your email',
        // Remove this in production - only for development/testing
        _dev: {
            resetToken,
            resetUrl,
            expiresIn: '15 minutes'
        }
    });
});

/**
 * @desc    Reset password with token
 * @route   PUT /api/v1/password/reset/:token
 * @access  Public
 */
exports.resetPassword = AsyncHandler(async (req, res) => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
        return res.status(400).json({
            status: 'failed',
            message: 'New password and confirmation are required'
        });
    }

    // Validate password confirmation
    const confirmValidation = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
        return res.status(400).json({
            status: 'failed',
            message: 'Password confirmation failed',
            errors: confirmValidation.errors
        });
    }

    // Hash token and lookup
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenData = passwordResetTokens.get(resetTokenHash);

    if (!tokenData) {
        return res.status(400).json({
            status: 'failed',
            message: 'Invalid or expired reset token'
        });
    }

    // Check if token expired
    if (Date.now() > tokenData.expiresAt) {
        passwordResetTokens.delete(resetTokenHash);
        return res.status(400).json({
            status: 'failed',
            message: 'Reset token has expired. Please request a new one.'
        });
    }

    // Find user
    let user;
    let UserModel;

    switch (tokenData.userType) {
        case 'admin':
            user = await Admin.findById(tokenData.userId);
            UserModel = Admin;
            break;
        case 'teacher':
            user = await Teacher.findById(tokenData.userId);
            UserModel = Teacher;
            break;
        case 'student':
            user = await Student.findById(tokenData.userId);
            UserModel = Student;
            break;
    }

    if (!user) {
        passwordResetTokens.delete(resetTokenHash);
        return res.status(404).json({
            status: 'failed',
            message: 'User not found'
        });
    }

    try {
        // Hash new password (validation happens inside)
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        user.password = hashedPassword;
        await user.save();

        // Delete used token
        passwordResetTokens.delete(resetTokenHash);

        // Blacklist all existing tokens
        await TokenBlacklist.blacklistAllUserTokens(user._id, 'password_change');

        res.status(200).json({
            status: 'success',
            message: 'Password reset successfully. Please login with your new password.'
        });
    } catch (error) {
        if (error.validationErrors) {
            return res.status(400).json({
                status: 'failed',
                message: 'Password validation failed',
                errors: error.validationErrors
            });
        }
        throw error;
    }
});

/**
 * @desc    Validate password strength
 * @route   POST /api/v1/password/validate
 * @access  Public
 */
exports.validatePasswordStrength = AsyncHandler(async (req, res) => {
    const { password } = req.body;
    const { 
        validatePassword, 
        getPasswordStrength, 
        getPasswordStrengthLabel 
    } = require("../utils/passwordValidator");

    if (!password) {
        return res.status(400).json({
            status: 'failed',
            message: 'Password is required'
        });
    }

    const validation = validatePassword(password);
    const strength = getPasswordStrength(password);
    const strengthLabel = getPasswordStrengthLabel(password);

    res.status(200).json({
        status: 'success',
        data: {
            isValid: validation.isValid,
            errors: validation.errors,
            strength,
            strengthLabel,
            meetsRequirements: validation.isValid
        }
    });
});

// Cleanup expired tokens periodically (run every hour)
setInterval(() => {
    const now = Date.now();
    for (const [hash, data] of passwordResetTokens.entries()) {
        if (now > data.expiresAt) {
            passwordResetTokens.delete(hash);
        }
    }
}, 60 * 60 * 1000);

module.exports = {
    changePassword: exports.changePassword,
    forgotPassword: exports.forgotPassword,
    resetPassword: exports.resetPassword,
    validatePasswordStrength: exports.validatePasswordStrength
};
