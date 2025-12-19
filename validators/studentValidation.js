/**
 * Student Validation Schemas
 * Joi validation schemas for student-related endpoints
 */

const Joi = require('joi');
const { objectId, email, name, phone } = require('./common');

/**
 * Update student profile validation
 */
const updateProfile = {
  body: Joi.object({
    name,
    email,
    phone,
    dateOfBirth: Joi.date().iso().max('now'),
    address: Joi.string().max(500).trim(),
  }).min(1),
};

/**
 * Student exam submission validation
 */
const submitExam = {
  params: Joi.object({
    examId: objectId.required(),
  }),
  body: Joi.object({
    answers: Joi.array()
      .items(
        Joi.object({
          questionId: objectId.required(),
          answer: Joi.string().valid('A', 'B', 'C', 'D').required(),
        })
      )
      .min(1)
      .required(),
  }),
};

/**
 * Write exam validation (start exam)
 */
const writeExam = {
  params: Joi.object({
    examId: objectId.required(),
  }),
};

/**
 * Check exam results validation
 */
const checkResults = {
  params: Joi.object({
    examId: objectId.required(),
  }),
};

/**
 * Exam remark request validation
 */
const requestRemark = {
  params: Joi.object({
    examId: objectId.required(),
  }),
  body: Joi.object({
    reason: Joi.string().min(10).max(1000).trim().required(),
  }),
};

module.exports = {
  updateProfile,
  submitExam,
  writeExam,
  checkResults,
  requestRemark,
};
