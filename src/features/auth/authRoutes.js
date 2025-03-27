// /src/features/auth/authRoutes.js

const express = require('express');
const authController = require('./authController');
const authMiddleware = require('./authMiddleware');
const { validate, schemas } = require('../shared/middleware/validator');
const rateLimiter = require('../shared/middleware/rateLimiter');
const requestLogger = require('../shared/middleware/requestLogger');

const router = express.Router();

// Apply request logger to all auth routes
router.use(requestLogger);

/**
 * Authentication routes
 */

// Register new user (with rate limiting and validation)
router.post(
  '/register',
  rateLimiter.auth,
  validate(schemas.userRegistration),
  authController.register
);

// Login user (token verification happens on the server)
router.post(
  '/login',
  rateLimiter.auth,
  authMiddleware.verifyToken,
  authController.login
);

// Logout user (client-side token removal)
router.post('/logout', authController.logout);

// Request password reset (with rate limiting and validation)
router.post(
  '/forgot-password',
  rateLimiter.auth,
  validate(schemas.passwordReset),
  authController.forgotPassword
);

// Get current user info (requires authentication)
router.get(
  '/me',
  authMiddleware.verifyToken,
  authController.getCurrentUser
);

module.exports = router;