const AppError = require('./AppError');

/**
 * Database Error
 * Used for database-related errors
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

module.exports = DatabaseError;
