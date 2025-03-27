const logger = require('./logger');
const config = require('./config');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, errorCode = 'UNKNOWN_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // Indicates this is an expected error

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'SERVER_ERROR';
  let message = err.message || 'Something went wrong';
  let details = err.details || {};

  // Log the error
  if (statusCode === 500) {
    logger.error(`Unhandled error: ${err.message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    });
  } else {
    logger.warn(`Operational error: ${err.message}`, {
      code: errorCode,
      statusCode,
      path: req.path,
      method: req.method
    });
  }

  // Don't expose error details in production
  if (config.server.env === 'production' && !err.isOperational) {
    message = 'Something went wrong';
    details = {};
  }

  // Standard error response format
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details: Object.keys(details).length > 0 ? details : undefined
    }
  });
};

// Handle unhandled rejections
const handleUnhandledRejection = (server) => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined
    });

    // In development, let the server continue
    if (config.server.env !== 'production') return;

    // In production, gracefully shut down the server
    if (server) {
      server.close(() => {
        logger.info('Server closed due to unhandled rejection');
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
};

// Handle uncaught exceptions
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', {
      message: err.message,
      stack: err.stack
    });

    // Uncaught exceptions are serious, so always exit
    process.exit(1);
  });
};

module.exports = {
  AppError,
  errorHandler,
  handleUnhandledRejection,
  handleUncaughtException
};