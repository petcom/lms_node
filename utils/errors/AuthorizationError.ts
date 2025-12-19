import { AppError } from './AppError';

/**
 * Authorization Error
 * Used when user doesn't have permission to access a resource
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action.') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}
