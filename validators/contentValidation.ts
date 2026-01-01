import Joi from 'joi';
import { objectId, pagination } from './common';

export const contentListQuery = {
  query: Joi.object({
    type: Joi.string().valid('scorm', 'custom'),
    customType: Joi.string().valid('exam', 'quiz', 'practice', 'other'),
    departmentId: objectId,
    page: pagination.page,
    limit: pagination.limit,
  }),
};

export const contentIdParam = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

export const customContentCreate = {
  body: Joi.object({
    customType: Joi.string().valid('exam', 'quiz', 'practice', 'other').required(),
    title: Joi.string().min(2).max(200).required(),
    payload: Joi.any(),
    html: Joi.string(),
    css: Joi.string(),
    departmentId: objectId,
  }),
};

export const customContentUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    customType: Joi.string().valid('exam', 'quiz', 'practice', 'other'),
    title: Joi.string().min(2).max(200),
    payload: Joi.any(),
    html: Joi.string(),
    css: Joi.string(),
    departmentId: objectId.allow(null),
  }).min(1),
};

export const courseUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    title: Joi.string().min(2).max(200),
    departmentId: objectId.allow(null),
    description: Joi.string().max(1000),
    programLevel: objectId.allow(null),
  }).min(1),
};

export const courseIdParam = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

export const customProgress = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    courseId: objectId.required(),
    courseContentId: objectId.required(),
    eventType: Joi.string().valid('answer', 'quiz_complete', 'section_complete').required(),
    payload: Joi.object({
      score: Joi.number().min(0),
      maxScore: Joi.number().min(0),
      durationSec: Joi.number().min(0),
    }).unknown(true),
  }),
};

export const reportsQuery = {
  query: Joi.object({
    courseId: objectId,
    learnerId: objectId,
    contentType: Joi.string().valid('scorm', 'custom'),
    customType: Joi.string().valid('exam', 'quiz', 'practice', 'other'),
  }),
};
