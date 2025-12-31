/**
 * Department Resources Validation Schemas
 */

import Joi from 'joi';
import { objectId, pagination } from './common';

export const staffUsersQuery = {
  query: Joi.object({
    type: Joi.string().valid('teacher', 'dept-admin', 'staff'),
    departmentId: objectId,
    page: pagination.page,
    limit: pagination.limit,
  }),
};

export const contentQuery = {
  query: Joi.object({
    type: Joi.string().valid('scorm', 'custom'),
    customType: Joi.string().valid('exam', 'quiz', 'practice', 'other'),
    departmentId: objectId,
    page: pagination.page,
    limit: pagination.limit,
  }),
};
