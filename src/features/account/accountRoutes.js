// /src/features/account/accountRoutes.js

const express = require('express');
const accountController = require('./accountController');
const { validate } = require('../shared/middleware/validator');
const accountSchemas = require('./accountModels');
const authMiddleware = require('../auth/authMiddleware');
const requestLogger = require('../shared/middleware/requestLogger');

const router = express.Router();

// Apply request logger to all account routes
router.use(requestLogger);

// Apply authentication to all account routes
router.use(authMiddleware.verifyToken);

/**
 * Account routes
 */

// Get user profile
router.get(
  '/profile',
  accountController.getProfile
);

// Update user profile
router.put(
  '/profile',
  validate(accountSchemas.updateProfile),
  accountController.updateProfile
);

// Get user settings
router.get(
  '/settings',
  accountController.getSettings
);

// Update user settings
router.put(
  '/settings',
  validate(accountSchemas.updateSettings),
  accountController.updateSettings
);

// Get user preferences
router.get(
  '/preferences',
  accountController.getPreferences
);

// Update user preferences
router.put(
  '/preferences',
  validate(accountSchemas.updatePreferences),
  accountController.updatePreferences
);

// Get onboarding status
router.get(
  '/onboarding',
  accountController.getOnboardingStatus
);

// Update onboarding status
router.put(
  '/onboarding',
  validate(accountSchemas.updateOnboarding),
  accountController.updateOnboardingStatus
);

module.exports = router;