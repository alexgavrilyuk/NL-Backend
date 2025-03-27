// /src/features/subscription/subscriptionRoutes.js

const express = require('express');
const subscriptionController = require('./subscriptionController');
const { validate, schemas } = require('../shared/middleware/validator');
const authMiddleware = require('../auth/authMiddleware');
const requestLogger = require('../shared/middleware/requestLogger');

const router = express.Router();

// Apply request logger to all subscription routes
router.use(requestLogger);

/**
 * Subscription routes
 */

// Get all subscription plans (public route)
router.get('/plans', subscriptionController.getPlans);

// Get current user's subscription status (requires authentication)
router.get(
  '/status',
  authMiddleware.verifyToken,
  subscriptionController.getStatus
);

// Activate trial for current user (requires authentication)
router.post(
  '/activate-trial',
  authMiddleware.verifyToken,
  validate(schemas.activateTrial),
  subscriptionController.activateTrial
);

// Change subscription plan (requires authentication)
router.put(
  '/change',
  authMiddleware.verifyToken,
  validate(schemas.changePlan),
  subscriptionController.changePlan
);

// Cancel subscription (requires authentication)
router.post(
  '/cancel',
  authMiddleware.verifyToken,
  subscriptionController.cancelSubscription
);

module.exports = router;