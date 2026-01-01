/**
 * Admin & Staff Validation Schemas
 * Joi validation schemas for admin and staff-related endpoints
 */

import Joi from 'joi';
import { objectId, email, name, phone } from './common';

/**
 * Update admin profile validation
 */
export const updateAdminProfile = {
  body: Joi.object({
    name,
    email,
    phone,
    department: objectId,
  }).min(1),
};

/**
 * Update staff profile validation
 */
export const updateStaffProfile = {
  body: Joi.object({
    name,
    email,
    phone,
    employeeId: Joi.string().trim(),
    subject: objectId,
    program: objectId,
    department: objectId,
  }).min(1),
};

/**
 * Admin actions on staff validation
 */
export const staffAction = {
  params: Joi.object({
    staffId: objectId.required(),
  }),
};

/**
 * Publish/unpublish exam results validation
 */
export const publishResults = {
  params: Joi.object({
    examId: objectId.required(),
  }),
  body: Joi.object({
    publish: Joi.boolean().required(),
  }),
};

/**
 * Promote learner validation
 */
export const promoteLearner = {
  params: Joi.object({
    learnerId: objectId.required(),
  }),
  body: Joi.object({
    classLevel: objectId.required(),
    academicYear: objectId.required(),
  }),
};

/**
 * Assign staff to subject validation
 */
export const assignStaff = {
  params: Joi.object({
    staffId: objectId.required(),
  }),
  body: Joi.object({
    subject: objectId.required(),
    program: objectId,
    classLevel: objectId,
  }),
};
