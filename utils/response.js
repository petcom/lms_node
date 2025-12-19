/**
 * Standardized API Response Utilities
 * Provides consistent response formats across all endpoints
 */

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {*} options.data - Response data
 * @param {string} [options.message='Success'] - Success message
 * @param {number} [options.statusCode=200] - HTTP status code
 * @returns {Object} JSON response
 */
exports.successResponse = (res, { data, message = 'Success', statusCode = 200 }) => {
    return res.status(statusCode).json({
        status: 'success',
        message,
        data
    });
};

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {Array} options.data - Array of data items
 * @param {Object} options.pagination - Pagination metadata
 * @param {number} options.pagination.page - Current page number
 * @param {number} options.pagination.limit - Items per page
 * @param {number} options.pagination.total - Total number of items
 * @param {string} [options.message='Success'] - Success message
 * @param {number} [options.statusCode=200] - HTTP status code
 * @returns {Object} JSON response
 */
exports.paginatedResponse = (res, { data, pagination, message = 'Success', statusCode = 200 }) => {
    const { page, limit, total } = pagination;
    const totalPages = Math.ceil(total / limit);
    
    return res.status(statusCode).json({
        status: 'success',
        message,
        data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            prevPage: page > 1 ? page - 1 : null
        }
    });
};

/**
 * Send a created response (201)
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {*} options.data - Created resource data
 * @param {string} [options.message='Resource created successfully'] - Success message
 * @returns {Object} JSON response
 */
exports.createdResponse = (res, { data, message = 'Resource created successfully' }) => {
    return exports.successResponse(res, { data, message, statusCode: 201 });
};

/**
 * Send a no content response (204)
 * @param {Object} res - Express response object
 * @returns {Object} Empty response
 */
exports.noContentResponse = (res) => {
    return res.status(204).send();
};

/**
 * Send an error response (handled by global error handler, but included for completeness)
 * @deprecated Use custom error classes instead (e.g., throw new ValidationError())
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {string} options.message - Error message
 * @param {number} [options.statusCode=500] - HTTP status code
 * @param {Array} [options.errors] - Array of validation errors
 * @returns {Object} JSON response
 */
exports.errorResponse = (res, { message, statusCode = 500, errors = [] }) => {
    const response = {
        status: 'error',
        message
    };
    
    if (errors.length > 0) {
        response.errors = errors;
    }
    
    return res.status(statusCode).json(response);
};
