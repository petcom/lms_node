import { AppError } from './AppError';

/**
 * Authentication Error
 * Used when authentication fails or token is invalid
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed. Please log in.') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}
