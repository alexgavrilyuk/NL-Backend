// /src/features/reporting/reportRoutes.js

const express = require('express');
const reportController = require('./reportController');
const { validate } = require('../shared/middleware/validator');
const reportSchemas = require('./reportModels');
const authMiddleware = require('../auth/authMiddleware');
const subscriptionMiddleware = require('../subscription/subscriptionMiddleware');
const rateLimiter = require('../shared/middleware/rateLimiter');
const requestLogger = require('../shared/middleware/requestLogger');

const router = express.Router();

// Apply request logger to all report routes
router.use(requestLogger);

// Apply authentication to all report routes
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.checkSubscription);

/**
 * Report routes
 */

// Create a new report
router.post(
  '/',
  validate(reportSchemas.createReport),
  reportController.createReport
);

// Get all reports for current user
router.get(
  '/',
  reportController.getReports
);

// Get a specific report
router.get(
  '/:id',
  reportController.getReport
);

// Update a report
router.put(
  '/:id',
  validate(reportSchemas.updateReport),
  reportController.updateReport
);

// Delete a report
router.delete(
  '/:id',
  reportController.deleteReport
);

// Export a report
router.post(
  '/:id/export',
  validate(reportSchemas.exportReport),
  rateLimiter.api,
  subscriptionMiddleware.checkFeatureAccess('pdf_export'),
  reportController.exportReport
);

// Share a report
router.post(
  '/:id/share',
  validate(reportSchemas.shareReport),
  subscriptionMiddleware.checkFeatureAccess('team_collaboration'),
  reportController.shareReport
);

// Get drill-down data for a report section
router.get(
  '/:id/drill-down',
  reportController.getDrillDownData
);

module.exports = router;