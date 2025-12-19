const AppError = require('./AppError');

/**
 * Authentication Error
 * Used when authentication fails or token is invalid
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed. Please log in.') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

module.exports = AuthenticationError;
