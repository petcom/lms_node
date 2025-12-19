import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Error as MongooseError } from 'mongoose';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

interface MongooseCastError extends MongooseError.CastError {
  path: string;
  value: any;
}

interface MongooseDuplicateKeyError extends Error {
  code: number;
  keyValue: Record<string, any>;
}

interface MongooseValidationError extends MongooseError.ValidationError {
  errors: Record<string, MongooseError.ValidatorError>;
}

/**
 * Handle Mongoose Cast Errors (invalid ObjectId)
 */
const handleCastErrorDB = (err: MongooseCastError): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle Mongoose Duplicate Key Errors
 */
const handleDuplicateFieldsDB = (err: MongooseDuplicateKeyError): AppError => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field} = '${value}'. Please use another value.`;
  return new AppError(message, 409);
};

/**
 * Handle Mongoose Validation Errors
 */
const handleValidationErrorDB = (err: MongooseValidationError): AppError => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT Errors
 */
const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again.', 401);
};

/**
 * Handle JWT Expired Errors
 */
const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired. Please log in again.', 401);
};

/**
 * Send error response in development mode
 */
const sendErrorDev = (err: AppError, res: Response): void => {
  // Log error in development
  logger.error('Error in development mode', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
  });

  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Send error response in production mode
 */
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.warn('Operational error', {
      message: err.message,
      statusCode: err.statusCode,
      status: err.status,
    });

    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // Programming or unknown error: don't leak error details
  else {
    // Log error for debugging
    logger.error('Programming error', {
      message: err.message,
      stack: err.stack,
      error: err,
    });

    // Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
  }
};

/**
 * Global Error Handler Middleware
 * Handles all errors in the application
 */
const globalErrHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  } else {
    // Default to development mode if NODE_ENV not set
    sendErrorDev(err, res);
  }
};

/**
 * 404 Not Found Handler
 * Handles requests to non-existent routes
 */
const notFoundErr = (req: Request, _res: Response, next: NextFunction): void => {
  const err = new AppError(`Cannot find ${req.originalUrl} on this server`, 404);
  next(err);
};

export { globalErrHandler, notFoundErr };
