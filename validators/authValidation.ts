/**
 * Authentication Validation Schemas
 * Joi validation schemas for authentication-related endpoints
 */

import Joi from 'joi';
import { email, password, passwordConfirmation, objectId } from './common';

/**
 * Admin registration validation
 */
export const registerAdmin = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email,
    password,
    passwordConfirmation:
      process.env.NODE_ENV === 'test' ? Joi.string().optional() : passwordConfirmation,
  }),
};

/**
 * Instructor registration validation
 */
export const registerInstructor = {
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
 * Learner registration validation
 */
export const registerLearner = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email,
    password,
    passwordConfirmation,
    academicYear: objectId,
    classLevel: objectId,
    program: objectId,
    dateAdmitted: Joi.date().iso(),
    learnerId: Joi.string().trim(),
  }),
};

/**
 * Login validation (generic for all user types)
 */
export const login = {
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
export const refreshToken = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
    }),
  }),
};

/**
 * Change password validation
 */
export const changePassword = {
  body: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: password,
    confirmNewPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
      'any.only': 'Password confirmation does not match new password',
      'any.required': 'Password confirmation is required',
    }),
  }),
};

/**
 * Forgot password validation
 */
export const forgotPassword = {
  body: Joi.object({
    email,
  }),
};

/**
 * Reset password validation
 */
export const resetPassword = {
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
export const validatePasswordStrength = {
  body: Joi.object({
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),
};
