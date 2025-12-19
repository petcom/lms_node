const AppError = require('./AppError');

/**
 * Not Found Error
 * Used when requested resource doesn't exist
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', identifier = '') {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.identifier = identifier;
  }
}

module.exports = NotFoundError;
