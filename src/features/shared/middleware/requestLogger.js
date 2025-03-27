// /src/features/shared/middleware/requestLogger.js

const logger = require('../../../core/logger');

/**
 * Middleware to log all API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requestLogger = (req, res, next) => {
  // Log the request
  logger.info(`API Request: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.uid : 'unauthenticated'
  });

  // Record the start time
  const start = Date.now();

  // Once the response is finished
  res.on('finish', () => {
    // Calculate request duration
    const duration = Date.now() - start;

    // Log the response
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`API Response: ${req.method} ${req.originalUrl} - ${res.statusCode}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user ? req.user.uid : 'unauthenticated'
    });
  });

  next();
};

module.exports = requestLogger;