const express = require('express');
const config = require('./config');
const logger = require('./logger');

// The base API path with version
const apiPath = `/api/${config.server.apiVersion}`;

// Register all routes from features
const registerRoutes = (app) => {
  logger.info('Registering routes...');

  // Create the API router
  const apiRouter = express.Router();

  // Import feature routes
  // Note: These imports will be added as we create the feature modules
  const authRoutes = require('../features/auth/authRoutes');
  // const subscriptionRoutes = require('../features/subscription/subscriptionRoutes');
  // const datasetRoutes = require('../features/datasets/datasetRoutes');
  // const promptRoutes = require('../features/aiProcessing/promptRoutes');
  // const reportRoutes = require('../features/reporting/reportRoutes');
  // const teamRoutes = require('../features/team/teamRoutes');
  // const accountRoutes = require('../features/account/accountRoutes');

  // Add a test route
  apiRouter.get('/test', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'NeuroLedger API is working!',
      timestamp: new Date()
    });
  });

  // Register feature routes
  apiRouter.use('/auth', authRoutes);
  // apiRouter.use('/subscription', subscriptionRoutes);
  // apiRouter.use('/datasets', datasetRoutes);
  // apiRouter.use('/prompts', promptRoutes);
  // apiRouter.use('/reports', reportRoutes);
  // apiRouter.use('/teams', teamRoutes);
  // apiRouter.use('/account', accountRoutes);

  // Register API router
  app.use(apiPath, apiRouter);

  // Add a health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      version: process.env.npm_package_version || '0.1.0',
      environment: config.server.env
    });
  });

  // Handle 404 for API routes
  app.use(apiPath, (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: `Endpoint not found: ${req.method} ${req.originalUrl}`
      }
    });
  });

  logger.info(`Routes registered under ${apiPath}`);
};

module.exports = { registerRoutes };