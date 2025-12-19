import { Response } from 'express';
import {
  SuccessResponse,
  PaginatedResponse,
  PaginationMeta,
  ApiError,
  ValidationErrorDetail,
} from '../types/api';

/**
 * Options for success response
 */
interface SuccessResponseOptions<T> {
  data: T;
  message?: string;
  statusCode?: number;
}

/**
 * Options for paginated response
 */
interface PaginatedResponseOptions<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  message?: string;
  statusCode?: number;
}

/**
 * Options for created response
 */
interface CreatedResponseOptions<T> {
  data: T;
  message?: string;
}

/**
 * Options for error response
 * @deprecated Use custom error classes instead (e.g., throw new ValidationError())
 */
interface ErrorResponseOptions {
  message: string;
  statusCode?: number;
  errors?: ValidationErrorDetail[];
}

/**
 * Send a successful response
 * @param res - Express response object
 * @param options - Response options
 * @returns JSON response
 */
export const successResponse = <T>(
  res: Response,
  { data, message = 'Success', statusCode = 200 }: SuccessResponseOptions<T>
): Response<SuccessResponse<T>> => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
};

/**
 * Send a paginated response
 * @param res - Express response object
 * @param options - Response options
 * @returns JSON response
 */
export const paginatedResponse = <T>(
  res: Response,
  { data, pagination, message = 'Success', statusCode = 200 }: PaginatedResponseOptions<T>
): Response<PaginatedResponse<T>> => {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);

  const paginationMeta: PaginationMeta = {
    page: parseInt(String(page), 10),
    limit: parseInt(String(limit), 10),
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
  };

  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
    pagination: paginationMeta,
  });
};

/**
 * Send a created response (201)
 * @param res - Express response object
 * @param options - Response options
 * @returns JSON response
 */
export const createdResponse = <T>(
  res: Response,
  { data, message = 'Resource created successfully' }: CreatedResponseOptions<T>
): Response<SuccessResponse<T>> => {
  return successResponse(res, { data, message, statusCode: 201 });
};

/**
 * Send a no content response (204)
 * @param res - Express response object
 * @returns Empty response
 */
export const noContentResponse = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Send an error response (handled by global error handler, but included for completeness)
 * @deprecated Use custom error classes instead (e.g., throw new ValidationError())
 * @param res - Express response object
 * @param options - Response options
 * @returns JSON response
 */
export const errorResponse = (
  res: Response,
  { message, statusCode = 500, errors = [] }: ErrorResponseOptions
): Response<ApiError> => {
  const response: ApiError = {
    status: 'error',
    message,
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};
