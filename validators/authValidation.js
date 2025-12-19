/**
 * Authentication Validation Schemas
 * Joi validation schemas for authentication-related endpoints
 */

const Joi = require('joi');
const { email, password, passwordConfirmation, objectId } = require('./common');

/**
 * Admin registration validation
 */
const registerAdmin = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email,
    password,
    passwordConfirmation,
  }),
};

/**
 * Teacher registration validation
 */
const registerTeacher = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email,
    password,
    passwordConfirmation,
    employeeId: Joi.string().trim(),
    dateEmployed: Joi.date().iso(),
    subject: Joi.string().trim(),
    program: Joi.string().trim(),
  }),
};

/**
 * Student registration validation
 */
const registerStudent = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email,
    password,
    passwordConfirmation,
    academicYear: objectId,
    classLevel: objectId,
    program: objectId,
    dateAdmitted: Joi.date().iso(),
    studentId: Joi.string().trim(),
  }),
};

/**
 * Login validation (generic for all user types)
 */
const login = {
  body: Joi.object({
    email,
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),
};

/**
 * Refresh token validation
 */
const refreshToken = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
    }),
  }),
};

/**
 * Change password validation
 */
const changePassword = {
  body: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: password,
    confirmNewPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match new password',
        'any.required': 'Password confirmation is required',
      }),
  }),
};

/**
 * Forgot password validation
 */
const forgotPassword = {
  body: Joi.object({
    email,
  }),
};

/**
 * Reset password validation
 */
const resetPassword = {
  params: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required',
    }),
  }),
  body: Joi.object({
    password,
    passwordConfirmation,
  }),
};

/**
 * Validate password strength
 */
const validatePasswordStrength = {
  body: Joi.object({
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),
};

module.exports = {
  registerAdmin,
  registerTeacher,
  registerStudent,
  login,
  refreshToken,
  changePassword,
  forgotPassword,
  resetPassword,
  validatePasswordStrength,
};
