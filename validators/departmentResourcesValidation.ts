/**
 * Department Resources Validation Schemas
 */

import Joi from 'joi';
import { objectId, pagination } from './common';

export const staffUsersQuery = {
  query: Joi.object({
    type: Joi.string().valid('instructor', 'dept-admin', 'staff'),
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

export const staffRolesUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    roles: Joi.array().items(Joi.string().trim()).required(),
  }),
};

export const staffDepartmentUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    departmentId: objectId.allow(null).required(),
  }),
};

export const contentCreate = {
  body: Joi.object({
    type: Joi.string().valid('scorm', 'custom').required(),
    title: Joi.when('type', {
      is: 'custom',
      then: Joi.string().trim().required(),
      otherwise: Joi.string().trim(),
    }),
    description: Joi.when('type', {
      is: 'custom',
      then: Joi.string().trim().required(),
      otherwise: Joi.string().trim(),
    }),
    customType: Joi.when('type', {
      is: 'custom',
      then: Joi.string().valid('exam', 'quiz', 'practice', 'other').required(),
      otherwise: Joi.forbidden(),
    }),
    course: Joi.when('type', {
      is: 'custom',
      then: objectId.required(),
      otherwise: Joi.forbidden(),
    }),
    program: Joi.when('type', {
      is: 'custom',
      then: objectId.required(),
      otherwise: Joi.forbidden(),
    }),
    programLevel: Joi.when('type', {
      is: 'custom',
      then: objectId,
      otherwise: Joi.forbidden(),
    }),
    academicTerm: Joi.when('type', {
      is: 'custom',
      then: objectId.required(),
      otherwise: Joi.forbidden(),
    }),
    academicYear: Joi.when('type', {
      is: 'custom',
      then: objectId.required(),
      otherwise: Joi.forbidden(),
    }),
    passMark: Joi.when('type', {
      is: 'custom',
      then: Joi.number().min(0).required(),
      otherwise: Joi.forbidden(),
    }),
    totalMark: Joi.when('type', {
      is: 'custom',
      then: Joi.number().min(1).required(),
      otherwise: Joi.forbidden(),
    }),
    duration: Joi.when('type', {
      is: 'custom',
      then: Joi.string().trim().required(),
      otherwise: Joi.forbidden(),
    }),
    examDate: Joi.when('type', {
      is: 'custom',
      then: Joi.date().iso().required(),
      otherwise: Joi.forbidden(),
    }),
    examTime: Joi.when('type', {
      is: 'custom',
      then: Joi.string().trim().required(),
      otherwise: Joi.forbidden(),
    }),
    examStatus: Joi.when('type', {
      is: 'custom',
      then: Joi.string().valid('pending', 'live').optional(),
      otherwise: Joi.forbidden(),
    }),
  }),
};

export const contentUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    type: Joi.string().valid('scorm', 'custom').required(),
    title: Joi.string().trim(),
    description: Joi.string().trim(),
    departmentId: objectId.allow(null),
    course: objectId,
    program: objectId,
    programLevel: objectId,
    academicTerm: objectId,
    academicYear: objectId,
    customType: Joi.string().valid('exam', 'quiz', 'practice', 'other'),
    passMark: Joi.number().min(0),
    totalMark: Joi.number().min(1),
    duration: Joi.string().trim(),
    examDate: Joi.date().iso(),
    examTime: Joi.string().trim(),
    examStatus: Joi.string().valid('pending', 'live'),
  }).min(2),
};

export const programCreate = {
  body: Joi.object({
    name: Joi.string().trim().required(),
    description: Joi.string().trim().required(),
    duration: Joi.string().trim().required(),
    code: Joi.string().trim(),
    departmentId: objectId,
  }),
};

export const programUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: Joi.string().trim(),
    description: Joi.string().trim(),
    duration: Joi.string().trim(),
    code: Joi.string().trim(),
  }).min(1),
};

export const programDepartmentUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    departmentId: objectId.allow(null).required(),
  }),
};

export const courseCreate = {
  body: Joi.object({
    title: Joi.string().trim().required(),
    description: Joi.string().trim(),
    program: objectId.required(),
    programLevel: objectId,
    departmentId: objectId,
  }),
};

export const courseUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    title: Joi.string().trim(),
    description: Joi.string().trim(),
    program: objectId,
    programLevel: objectId,
  }).min(1),
};

export const courseDepartmentUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    departmentId: objectId.allow(null).required(),
  }),
};

export const courseProgramUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    programId: objectId.allow(null).required(),
  }),
};

export const departmentUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: Joi.string().trim(),
    code: Joi.string().trim(),
    passingStyleScore: Joi.number().min(0).max(100).allow(null),
  }).min(1),
};
