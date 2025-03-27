// /src/features/shared/middleware/errorHandler.js

const { AppError } = require('../../../core/errorHandler');
const logger = require('../../../core/logger');

/**
 * Feature-specific error handler middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const featureErrorHandler = (err, req, res, next) => {
  // If it's not an AppError, convert it to one
  if (!(err instanceof AppError)) {
    // Handle specific error types
    if (err.name === 'ValidationError') {
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', { details: err.details }));
    }

    // Log the unexpected error
    logger.error(`Unexpected error in feature middleware: ${err.message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method
    });

    // Convert to AppError for consistent handling
    err = new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR');
  }

  // Pass to the global error handler
  next(err);
};

module.exports = featureErrorHandler;