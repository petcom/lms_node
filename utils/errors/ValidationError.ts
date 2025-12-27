import { AppError } from './AppError';
import { ValidationErrorDetail } from '../../types/api';

/**
 * Validation Error
 * Used for input validation failures
 */
export class ValidationError extends AppError {
  errors: ValidationErrorDetail[];

  constructor(message: string = 'Validation failed', errors: ValidationErrorDetail[] = []) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
