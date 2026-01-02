import Joi from 'joi';

const paginationOverride = Joi.object({
  limit: Joi.number().integer().min(1),
  maxLimit: Joi.number().integer().min(1),
}).min(1);

export const updateSettings = {
  body: Joi.object({
    pagination: Joi.object({
      defaultLimit: Joi.number().integer().min(1),
      maxLimit: Joi.number().integer().min(1),
      overrides: Joi.object().pattern(Joi.string(), paginationOverride),
    }).min(1),
  }).min(1),
};
