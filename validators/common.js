/**
 * Common Validation Patterns
 * Reusable Joi validation patterns used across different schemas
 */

const Joi = require('joi');

/**
 * MongoDB ObjectId validation pattern
 */
const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ObjectId format');

/**
 * Email validation pattern
 */
const email = Joi.string()
  .email({ minDomainSegments: 2 })
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  });

/**
 * Password validation pattern (matches passwordValidator requirements)
 */
const password = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required',
  });

/**
 * Password confirmation validation (must match password)
 */
const passwordConfirmation = Joi.string()
  .valid(Joi.ref('password'))
  .required()
  .messages({
    'any.only': 'Password confirmation does not match password',
    'any.required': 'Password confirmation is required',
  });

/**
 * Name validation pattern (for first/last name)
 */
const name = Joi.string()
  .min(2)
  .max(50)
  .trim()
  .pattern(/^[a-zA-Z\s'-]+$/)
  .required()
  .messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
    'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
    'any.required': 'Name is required',
  });

/**
 * Phone number validation (basic international format)
 */
const phone = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .messages({
    'string.pattern.base': 'Please provide a valid phone number',
  });

/**
 * Date validation (ISO format or Date object)
 */
const date = Joi.date()
  .iso()
  .messages({
    'date.base': 'Please provide a valid date',
    'date.format': 'Date must be in ISO format',
  });

/**
 * Pagination parameters
 */
const pagination = {
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1',
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
};

/**
 * Academic year format (e.g., "2024-2025")
 */
const academicYear = Joi.string()
  .pattern(/^\d{4}-\d{4}$/)
  .custom((value, helpers) => {
    const [start, end] = value.split('-').map(Number);
    if (end !== start + 1) {
      return helpers.error('any.invalid');
    }
    return value;
  })
  .messages({
    'string.pattern.base': 'Academic year must be in format YYYY-YYYY (e.g., 2024-2025)',
    'any.invalid': 'Academic year end must be one year after start',
  });

/**
 * Grade/Class level validation
 */
const classLevel = Joi.string()
  .valid('Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 
         'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12')
  .messages({
    'any.only': 'Invalid class level',
  });

/**
 * Academic term validation
 */
const academicTerm = Joi.string()
  .valid('1st Term', '2nd Term', '3rd Term')
  .messages({
    'any.only': 'Academic term must be 1st Term, 2nd Term, or 3rd Term',
  });

module.exports = {
  objectId,
  email,
  password,
  passwordConfirmation,
  name,
  phone,
  date,
  pagination,
  academicYear,
  classLevel,
  academicTerm,
};
