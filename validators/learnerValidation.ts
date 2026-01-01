/**
 * Learner Validation Schemas
 * Joi validation schemas for learner-related endpoints
 */

import Joi from 'joi';
import { objectId, email, name, phone } from './common';

/**
 * Update learner profile validation
 */
export const updateProfile = {
  body: Joi.object({
    name,
    email,
    phone,
    dateOfBirth: Joi.date().iso().max('now'),
    address: Joi.string().max(500).trim(),
  }).min(1),
};

/**
 * Learner exam submission validation
 */
export const submitExam = {
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
export const writeExam = {
  params: Joi.object({
    examId: objectId.required(),
  }),
};

/**
 * Check exam results validation
 */
export const checkResults = {
  params: Joi.object({
    examId: objectId.required(),
  }),
};

/**
 * Exam remark request validation
 */
export const requestRemark = {
  params: Joi.object({
    examId: objectId.required(),
  }),
  body: Joi.object({
    reason: Joi.string().min(10).max(1000).trim().required(),
  }),
};
