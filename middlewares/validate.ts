/**
 * Validation Middleware
 * Uses Joi schemas to validate request data (body, params, query)
 * Returns 400 Bad Request with detailed validation errors if validation fails
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors/ValidationError';

interface ValidationSchema {
  body?: Joi.Schema;
  params?: Joi.Schema;
  query?: Joi.Schema;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}

interface ValidationErrors {
  body?: ValidationErrorDetail[];
  params?: ValidationErrorDetail[];
  query?: ValidationErrorDetail[];
}

/**
 * Validate request data against a Joi schema
 * @param schema - Joi schema object with optional body, params, query schemas
 * @returns Express middleware function
 */
const validate = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const validationOptions: Joi.ValidationOptions = {
      abortEarly: false, // Return all errors, not just the first one
      allowUnknown: true, // Allow unknown keys that will be ignored
      stripUnknown: true, // Remove unknown keys from validated data
    };

    const errors: ValidationErrors = {};

    // Validate request body if schema provided
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      if (error) {
        errors.body = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
      } else {
        req.body = value; // Use validated and sanitized data
      }
    }

    // Validate request params if schema provided
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      if (error) {
        errors.params = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
      } else {
        req.params = value;
      }
    }

    // Validate request query if schema provided
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      if (error) {
        errors.query = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
      } else {
        req.query = value;
      }
    }

    // If there are any validation errors, throw ValidationError
    if (Object.keys(errors).length > 0) {
      const errorMessages: string[] = [];

      if (errors.body) {
        errors.body.forEach((err) => errorMessages.push(`${err.field}: ${err.message}`));
      }
      if (errors.params) {
        errors.params.forEach((err) => errorMessages.push(`${err.field}: ${err.message}`));
      }
      if (errors.query) {
        errors.query.forEach((err) => errorMessages.push(`${err.field}: ${err.message}`));
      }

      throw new ValidationError(errorMessages.join(', '));
    }

    next();
  };
};

export default validate;
