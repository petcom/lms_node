/**
 * Admin & Teacher Validation Schemas
 * Joi validation schemas for admin and teacher-related endpoints
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
 * Update teacher profile validation
 */
export const updateTeacherProfile = {
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
    teacherId: objectId.required(),
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
 * Promote student validation
 */
export const promoteStudent = {
  params: Joi.object({
    studentId: objectId.required(),
  }),
  body: Joi.object({
    classLevel: objectId.required(),
    academicYear: objectId.required(),
  }),
};

/**
 * Assign teacher to subject validation
 */
export const assignTeacher = {
  params: Joi.object({
    teacherId: objectId.required(),
  }),
  body: Joi.object({
    subject: objectId.required(),
    program: objectId,
    classLevel: objectId,
  }),
};
