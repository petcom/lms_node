import { AppError } from './AppError';

/**
 * Database Error
 * Used for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed.', isOperational: boolean = false) {
    super(message, 500, isOperational);
    this.name = 'DatabaseError';
  }
}
