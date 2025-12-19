const AppError = require('./AppError');

/**
 * Conflict Error
 * Used when resource already exists or conflicts with existing data
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists or conflicts with existing data') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

module.exports = ConflictError;
