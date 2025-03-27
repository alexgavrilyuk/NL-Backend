// /src/features/datasets/datasetRoutes.js

const express = require('express');
const datasetController = require('./datasetController');
const { validate, schemas } = require('../shared/middleware/validator');
const authMiddleware = require('../auth/authMiddleware');
const subscriptionMiddleware = require('../subscription/subscriptionMiddleware');
const requestLogger = require('../shared/middleware/requestLogger');

const router = express.Router();

// Apply request logger to all dataset routes
router.use(requestLogger);

// Apply authentication to all dataset routes
router.use(authMiddleware.verifyToken);

/**
 * Dataset routes
 */

// Upload a new dataset
router.post(
  '/upload',
  subscriptionMiddleware.checkDatasetLimit(),
  datasetController.uploadDataset
);

// Get all datasets for current user
router.get(
  '/',
  datasetController.getDatasets
);

// Get a specific dataset
router.get(
  '/:id',
  datasetController.getDataset
);

// Update a dataset
router.put(
  '/:id',
  validate(schemas.updateDataset),
  datasetController.updateDataset
);

// Delete a dataset
router.delete(
  '/:id',
  datasetController.deleteDataset
);

// Get dataset schema
router.get(
  '/:id/schema',
  datasetController.getSchema
);

// Update dataset schema
router.put(
  '/:id/schema',
  validate(schemas.updateSchema),
  datasetController.updateSchema
);

// Download dataset
router.get(
  '/:id/download',
  datasetController.downloadDataset
);

module.exports = router;