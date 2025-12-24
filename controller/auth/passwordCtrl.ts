import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import crypto from 'crypto';
import { Types } from 'mongoose';
import Admin from '../../model/Staff/Admin';
import Teacher from '../../model/Staff/Teacher';
import Student from '../../model/Academic/Student';
import { IAdmin, ITeacher, IStudent } from '../../types/models';
import { hashPassword, isPassMatched } from '../../utils/helpers';
import { 
    validatePasswordConfirmation, 
    validatePassword,
    getPasswordStrength,
    getPasswordStrengthLabel
} from '../../utils/passwordValidator';
import TokenBlacklist from '../../model/Auth/TokenBlacklist';

// Request body interfaces
interface ChangePasswordRequestBody {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

interface ForgotPasswordRequestBody {
    email: string;
    userType: 'admin' | 'teacher' | 'student';
}

interface ResetPasswordRequestBody {
    newPassword: string;
    confirmPassword: string;
}

interface ValidatePasswordRequestBody {
    password: string;
}

interface ResetTokenData {
    userId: Types.ObjectId;
    userType: 'admin' | 'teacher' | 'student';
    expiresAt: number;
}

// Password reset token storage (in production, use Redis or database)
const passwordResetTokens = new Map<string, ResetTokenData>();

/**
 * @desc    Change password (requires old password)
 * @route   PUT /api/v1/password/change
 * @access  Private
 */
export const changePassword = AsyncHandler(async (req: Request<{}, {}, ChangePasswordRequestBody>, res: Response): Promise<void> => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.userAuth?._id;
    
    if (!userId) {
        res.status(401).json({
            status: 'failed',
            message: 'User not authenticated'
        });
        return;
    }

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
        res.status(400).json({
            status: 'failed',
            message: 'Old password, new password, and confirmation are required'
        });
        return;
    }

    // Validate password confirmation
    const confirmValidation = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
        res.status(400).json({
            status: 'failed',
            message: 'Password confirmation failed',
            errors: confirmValidation.errors
        });
        return;
    }

    // Find user (check all collections)
    let user: IAdmin | ITeacher | IStudent | null = await Admin.findById(userId);

    if (!user) {
        user = await Teacher.findById(userId);
    }

    if (!user) {
        user = await Student.findById(userId);
    }

    if (!user) {
        res.status(404).json({
            status: 'failed',
            message: 'User not found'
        });
        return;
    }

    // Verify old password
    const isOldPasswordCorrect = await isPassMatched(oldPassword, user.password);
    if (!isOldPasswordCorrect) {
        res.status(401).json({
            status: 'failed',
            message: 'Old password is incorrect'
        });
        return;
    }

    // Check if new password is same as old password
    const isSamePassword = await isPassMatched(newPassword, user.password);
    if (isSamePassword) {
        res.status(400).json({
            status: 'failed',
            message: 'New password must be different from old password'
        });
        return;
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
        if (error && typeof error === 'object' && 'validationErrors' in error) {
            res.status(400).json({
                status: 'failed',
                message: 'Password validation failed',
                errors: (error as any).validationErrors
            });
            return;
        }
        throw error;
    }
});

/**
 * @desc    Request password reset (generates reset token)
 * @route   POST /api/v1/password/forgot
 * @access  Public
 */
export const forgotPassword = AsyncHandler(async (req: Request<{}, {}, ForgotPasswordRequestBody>, res: Response): Promise<void> => {
    const { email, userType } = req.body;

    if (!email || !userType) {
        res.status(400).json({
            status: 'failed',
            message: 'Email and user type are required'
        });
        return;
    }

    // Find user based on type
    let user: IAdmin | ITeacher | IStudent | null = null;

    switch (userType) {
        case 'admin':
            user = await Admin.findOne({ email });
            break;
        case 'teacher':
            user = await Teacher.findOne({ email });
            break;
        case 'student':
            user = await Student.findOne({ email });
            break;
        default:
            res.status(400).json({
                status: 'failed',
                message: 'Invalid user type. Must be: admin, teacher, or student'
            });
            return;
    }

    if (!user) {
        // Security: Don't reveal if email exists
        res.status(200).json({
            status: 'success',
            message: 'If the email exists, a password reset link has been sent'
        });
        return;
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
export const resetPassword = AsyncHandler(async (req: Request<{ token: string }, {}, ResetPasswordRequestBody>, res: Response): Promise<void> => {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
        res.status(400).json({
            status: 'failed',
            message: 'New password and confirmation are required'
        });
        return;
    }

    // Validate password confirmation
    const confirmValidation = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
        res.status(400).json({
            status: 'failed',
            message: 'Password confirmation failed',
            errors: confirmValidation.errors
        });
        return;
    }

    // Hash token and lookup
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const tokenData = passwordResetTokens.get(resetTokenHash);

    if (!tokenData) {
        res.status(400).json({
            status: 'failed',
            message: 'Invalid or expired reset token'
        });
        return;
    }

    // Check if token expired
    if (Date.now() > tokenData.expiresAt) {
        passwordResetTokens.delete(resetTokenHash);
        res.status(400).json({
            status: 'failed',
            message: 'Reset token has expired. Please request a new one.'
        });
        return;
    }

    // Find user
    let user: IAdmin | ITeacher | IStudent | null = null;

    switch (tokenData.userType) {
        case 'admin':
            user = await Admin.findById(tokenData.userId);
            break;
        case 'teacher':
            user = await Teacher.findById(tokenData.userId);
            break;
        case 'student':
            user = await Student.findById(tokenData.userId);
            break;
    }

    if (!user) {
        passwordResetTokens.delete(resetTokenHash);
        res.status(404).json({
            status: 'failed',
            message: 'User not found'
        });
        return;
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
        if (error && typeof error === 'object' && 'validationErrors' in error) {
            res.status(400).json({
                status: 'failed',
                message: 'Password validation failed',
                errors: (error as any).validationErrors
            });
            return;
        }
        throw error;
    }
});

/**
 * @desc    Validate password strength
 * @route   POST /api/v1/password/validate
 * @access  Public
 */
export const validatePasswordStrength = AsyncHandler(async (req: Request<{}, {}, ValidatePasswordRequestBody>, res: Response): Promise<void> => {
    const { password } = req.body;

    if (!password) {
        res.status(400).json({
            status: 'failed',
            message: 'Password is required'
        });
        return;
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

// Cleanup expired tokens periodically (run every hour; skip in tests to avoid open handles)
if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        const now = Date.now();
        for (const [hash, data] of passwordResetTokens.entries()) {
            if (now > data.expiresAt) {
                passwordResetTokens.delete(hash);
            }
        }
    }, 60 * 60 * 1000);
}
