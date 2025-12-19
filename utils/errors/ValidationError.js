const AppError = require('./AppError');

/**
 * Validation Error
 * Used for input validation failures
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

module.exports = ValidationError;
