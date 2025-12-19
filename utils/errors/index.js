/**
 * Custom Error Classes
 * Centralized export of all custom error classes
 */

const AppError = require('./AppError');
const ValidationError = require('./ValidationError');
const AuthenticationError = require('./AuthenticationError');
const AuthorizationError = require('./AuthorizationError');
const NotFoundError = require('./NotFoundError');
const DatabaseError = require('./DatabaseError');
const ConflictError = require('./ConflictError');

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  ConflictError
};
