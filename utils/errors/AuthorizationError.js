const AppError = require('./AppError');

/**
 * Authorization Error
 * Used when user doesn't have permission to access resource
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied. You do not have permission to perform this action.', requiredRoles = []) {
    super(message, 403);
    this.name = 'AuthorizationError';
    this.requiredRoles = requiredRoles;
  }
}

module.exports = AuthorizationError;
