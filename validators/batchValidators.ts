/**
 * Batch Validation Schemas
 * Joi validation schemas for batch operation endpoints
 */

import Joi from 'joi';
import { objectId } from './common';

const MAX_BATCH_SIZE_ENROLLMENTS = 100;
const MAX_BATCH_SIZE_ROLES = 50;
const MAX_BATCH_SIZE_CONTENT = 100;

/**
 * Batch Program Enrollment validation
 */
export const batchCreateProgramEnrollments = {
  body: Joi.object({
    enrollments: Joi.array()
      .items(
        Joi.object({
          learner: objectId.required(),
          program: objectId.required(),
          status: Joi.string().valid('enrolled', 'active', 'completed', 'withdrawn'),
          enrolledAt: Joi.date().iso(),
        })
      )
      .min(1)
      .max(MAX_BATCH_SIZE_ENROLLMENTS)
      .required()
      .messages({
        'array.max': `Batch size cannot exceed ${MAX_BATCH_SIZE_ENROLLMENTS} items`,
        'array.min': 'At least one enrollment is required',
      }),
  }),
};

/**
 * Batch Class Enrollment validation
 */
export const batchCreateClassEnrollments = {
  body: Joi.object({
    enrollments: Joi.array()
      .items(
        Joi.object({
          learner: objectId.required(),
          classId: objectId.required(),
          enrolledAt: Joi.date().iso(),
        })
      )
      .min(1)
      .max(MAX_BATCH_SIZE_ENROLLMENTS)
      .required()
      .messages({
        'array.max': `Batch size cannot exceed ${MAX_BATCH_SIZE_ENROLLMENTS} items`,
        'array.min': 'At least one enrollment is required',
      }),
  }),
};

/**
 * Batch Course Enrollment validation
 */
export const batchCreateCourseEnrollments = {
  body: Joi.object({
    enrollments: Joi.array()
      .items(
        Joi.object({
          learner: objectId.required(),
          course: objectId.required(),
          classId: objectId,
          startedAt: Joi.date().iso(),
        })
      )
      .min(1)
      .max(MAX_BATCH_SIZE_ENROLLMENTS)
      .required()
      .messages({
        'array.max': `Batch size cannot exceed ${MAX_BATCH_SIZE_ENROLLMENTS} items`,
        'array.min': 'At least one enrollment is required',
      }),
  }),
};

/**
 * Batch Staff Role Update validation
 */
export const batchUpdateStaffRoles = {
  body: Joi.object({
    updates: Joi.array()
      .items(
        Joi.object({
          staffId: objectId.required(),
          roles: Joi.array()
            .items(Joi.string().valid('global-admin', 'department-admin', 'instructor', 'support'))
            .min(1)
            .required(),
          primaryRole: Joi.string().valid(
            'global-admin',
            'department-admin',
            'instructor',
            'support'
          ),
        })
      )
      .min(1)
      .max(MAX_BATCH_SIZE_ROLES)
      .required()
      .messages({
        'array.max': `Batch size cannot exceed ${MAX_BATCH_SIZE_ROLES} items`,
        'array.min': 'At least one update is required',
      }),
  }),
};

/**
 * Batch Course Content Update validation
 */
export const batchUpdateCourseContent = {
  body: Joi.object({
    updates: Joi.array()
      .items(
        Joi.object({
          contentId: objectId.required(),
          order: Joi.number().integer().min(1),
          weight: Joi.number().min(0).max(100),
          isRequired: Joi.boolean(),
        })
      )
      .min(1)
      .max(MAX_BATCH_SIZE_CONTENT)
      .required()
      .messages({
        'array.max': `Batch size cannot exceed ${MAX_BATCH_SIZE_CONTENT} items`,
        'array.min': 'At least one update is required',
      }),
  }),
};
