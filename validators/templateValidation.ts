/**
 * Template Validation Schemas
 */

import Joi from 'joi';
import { objectId } from './common';

const regionSchema = Joi.object({
  id: Joi.string().trim().required(),
  kind: Joi.string().valid('scorm', 'custom').required(),
  title: Joi.string().trim().required(),
});

const layoutSchema = Joi.object({
  grid: Joi.string().allow('').trim(),
  regions: Joi.array().items(regionSchema).required(),
});

export const templateListQuery = {
  query: Joi.object({
    departmentId: objectId,
    type: Joi.string().valid('scorm', 'custom', 'hybrid'),
    status: Joi.string().valid('draft', 'published', 'archived'),
    isGlobal: Joi.boolean(),
  }),
};

export const templateCreate = {
  body: Joi.object({
    name: Joi.string().trim().required(),
    description: Joi.string().allow('').trim(),
    type: Joi.string().valid('scorm', 'custom', 'hybrid').required(),
    departmentId: objectId,
    isGlobal: Joi.boolean(),
    css: Joi.string().allow(''),
    layout: layoutSchema.required(),
  }),
};

export const templateUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: Joi.string().trim(),
    description: Joi.string().allow('').trim(),
    css: Joi.string().allow(''),
    layout: layoutSchema,
    status: Joi.string().valid('draft', 'published', 'archived'),
  }).min(1),
};

export const templateIdParam = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

export const scoreRequest = {
  body: Joi.object({
    departmentId: objectId.required(),
    css: Joi.string().allow('').required(),
  }),
};

export const masterCssParam = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

export const masterCssUpdate = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    css: Joi.string().allow('').required(),
  }),
};
