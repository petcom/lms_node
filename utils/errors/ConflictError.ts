import { AppError } from './AppError';

/**
 * Conflict Error
 * Used when there's a conflict (e.g., duplicate entry)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists.') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}
