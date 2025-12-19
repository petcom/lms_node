/**
 * Admin & Teacher Validation Schemas
 * Joi validation schemas for admin and teacher-related endpoints
 */

const Joi = require('joi');
const { objectId, email, name, phone } = require('./common');

/**
 * Update admin profile validation
 */
const updateAdminProfile = {
  body: Joi.object({
    name,
    email,
    phone,
  }).min(1),
};

/**
 * Update teacher profile validation
 */
const updateTeacherProfile = {
  body: Joi.object({
    name,
    email,
    phone,
    employeeId: Joi.string().trim(),
    subject: objectId,
    program: objectId,
  }).min(1),
};

/**
 * Admin actions on staff validation
 */
const staffAction = {
  params: Joi.object({
    teacherId: objectId.required(),
  }),
};

/**
 * Publish/unpublish exam results validation
 */
const publishResults = {
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
const promoteStudent = {
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
const assignTeacher = {
  params: Joi.object({
    teacherId: objectId.required(),
  }),
  body: Joi.object({
    subject: objectId.required(),
    program: objectId,
    classLevel: objectId,
  }),
};

module.exports = {
  updateAdminProfile,
  updateTeacherProfile,
  staffAction,
  publishResults,
  promoteStudent,
  assignTeacher,
};
