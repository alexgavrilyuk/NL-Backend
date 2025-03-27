// /src/features/aiProcessing/promptRoutes.js

const express = require('express');
const promptController = require('./promptController');
const { validate, schemas } = require('../shared/middleware/validator');
const authMiddleware = require('../auth/authMiddleware');
const subscriptionMiddleware = require('../subscription/subscriptionMiddleware');
const rateLimiter = require('../shared/middleware/rateLimiter');
const requestLogger = require('../shared/middleware/requestLogger');
const { promptSchemas } = require('./promptModels');

const router = express.Router();

// Apply request logger to all prompt routes
router.use(requestLogger);

/**
 * Prompt routes
 */

// Create a new prompt (requires authentication and active subscription)
router.post(
  '/',
  authMiddleware.verifyToken,
  authMiddleware.checkSubscription,
  validate(promptSchemas.createPrompt),
  rateLimiter.api,
  promptController.createPrompt
);

// Get list of prompts for current user
router.get(
  '/',
  authMiddleware.verifyToken,
  promptController.getPrompts
);

// Get a specific prompt by ID
router.get(
  '/:id',
  authMiddleware.verifyToken,
  promptController.getPromptById
);

// Execute generated code for a prompt
router.post(
  '/:id/execute',
  authMiddleware.verifyToken,
  authMiddleware.checkSubscription,
  validate(promptSchemas.executePrompt),
  rateLimiter.api,
  promptController.executePrompt
);

// Get results of a prompt execution
router.get(
  '/:id/results',
  authMiddleware.verifyToken,
  promptController.getResults
);

module.exports = router;