// /src/features/shared/middleware/rateLimiter.js

const rateLimit = require('express-rate-limit');
const config = require('../../../core/config');
const { AppError } = require('../../../core/errorHandler');

/**
 * Create a rate limiter middleware with custom options
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware function
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.security.rateLimitWindow * 60 * 1000, // Convert minutes to milliseconds
    max: config.security.rateLimitMax, // Limit each IP to N requests per window
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
      next(new AppError('Too many requests, please try again later.', 429, 'RATE_LIMIT_EXCEEDED'));
    }
  };

  return rateLimit({
    ...defaultOptions,
    ...options
  });
};

// Pre-configured rate limiters for common scenarios
const rateLimiters = {
  // Strict limits for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: 'Too many authentication attempts, please try again after 15 minutes'
  }),

  // Normal API rate limits
  api: createRateLimiter(),

  // Custom rate limiter factory
  create: createRateLimiter
};

module.exports = rateLimiters;