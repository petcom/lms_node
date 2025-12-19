import { AppError } from './AppError';

/**
 * Not Found Error
 * Used when a requested resource is not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found.') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}
