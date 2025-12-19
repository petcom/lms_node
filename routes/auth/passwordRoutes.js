const express = require("express");
const {
    changePassword,
    forgotPassword,
    resetPassword,
    validatePasswordStrength
} = require("../../controller/auth/passwordCtrl");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const validate = require("../../middlewares/validate");
const authValidation = require("../../validators/authValidation");
const { passwordResetLimiter } = require("../../middlewares/rateLimiter");
const Admin = require("../../model/Staff/Admin");

const passwordRouter = express.Router();

/**
 * @swagger
 * /api/v1/password/forgot:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       429:
 *         description: Too many password reset attempts
 */
passwordRouter.post("/forgot", passwordResetLimiter, validate(authValidation.forgotPassword), forgotPassword);

/**
 * @swagger
 * /api/v1/password/reset/{token}:
 *   put:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - passwordConfirmation
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 example: NewPassword@123
 *               passwordConfirmation:
 *                 type: string
 *                 format: password
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         description: Invalid or expired token
 *       429:
 *         description: Too many password reset attempts
 */
passwordRouter.put("/reset/:token", passwordResetLimiter, validate(authValidation.resetPassword), resetPassword);

/**
 * @swagger
 * /api/v1/password/validate:
 *   post:
 *     summary: Validate password strength
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: Test@123
 *     responses:
 *       200:
 *         description: Password strength validation result
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
passwordRouter.post("/validate", validate(authValidation.validatePasswordStrength), validatePasswordStrength);

/**
 * @swagger
 * /api/v1/password/change:
 *   put:
 *     summary: Change password (requires current password)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - passwordConfirmation
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *               passwordConfirmation:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
passwordRouter.put("/change", isAuthenticated(Admin), validate(authValidation.changePassword), changePassword);

module.exports = passwordRouter;
