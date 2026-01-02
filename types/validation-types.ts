// Validation type definitions
import { ValidationError as JoiValidationError } from 'joi';

// Validation Target
export type ValidationTarget = 'body' | 'params' | 'query';

// Custom Validation Error (without duplicating ValidationErrorDetail from api.ts)
export interface CustomValidationError {
  details: Array<{
    field: string;
    message: string;
    type?: string;
  }>;
  message: string;
}

// Re-export Joi types for convenience
export type { JoiValidationError };
