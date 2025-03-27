// /src/features/datasets/datasetController.js

const multer = require('multer');
const { AppError } = require('../../core/errorHandler');
const logger = require('../../core/logger');
const {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments
} = require('../shared/database/dbUtils');
const storageService = require('./storageService');
const schemaDetector = require('./schemaDetector');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV and Excel files
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const allowedExtensions = ['csv', 'xls', 'xlsx'];

    const fileExtension = file.originalname.split('.').pop().toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Only CSV and Excel files are allowed.', 400, 'INVALID_FILE_TYPE'));
    }
  }
}).single('file');

/**
 * Dataset controller for handling dataset operations
 */
const datasetController = {
  /**
   * Upload a new dataset
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  uploadDataset: async (req, res, next) => {
    // Create a Promise wrapper around multer to handle file upload
    const handleUpload = new Promise((resolve, reject) => {
      upload(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              reject(new AppError('File size exceeds 10MB limit', 400, 'FILE_TOO_LARGE'));
            } else {
              reject(new AppError(`File upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
            }
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });

    try {
      // Handle file upload
      await handleUpload;

      // Check if file exists
      if (!req.file) {
        throw new AppError('No file uploaded', 400, 'NO_FILE');
      }

      // Get metadata from request body
      let metadata = {};
      if (req.body.metadata) {
        try {
          metadata = JSON.parse(req.body.metadata);
        } catch (error) {
          logger.warn(`Invalid metadata JSON: ${error.message}`);
          // Continue with empty metadata
        }
      }

      // Get user ID from authenticated request
      const { uid } = req.user;

      // Upload file to Google Cloud Storage
      const fileInfo = await storageService.uploadFile(req.file, uid);

      // Detect schema from file
      const schema = await schemaDetector.detectSchema(
        req.file.buffer,
        req.file.originalname
      );

      // Create dataset document
      const dataset = await createDocument('datasets', {
        name: req.body.name || req.file.originalname,
        description: req.body.description || '',
        ownerId: uid,
        teamId: metadata.teamId || null,
        fileInfo,
        schema,
        metadata: {
          business: metadata.business || '',
          timeframe: metadata.timeframe || '',
          context: metadata.context || '',
          ...metadata
        },
        ignored: false
      });

      // Return success response
      res.status(201).json({
        success: true,
        data: {
          dataset
        }
      });
    } catch (error) {
      logger.error(`Dataset upload error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get all datasets for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getDatasets: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Parse query parameters
      const filter = req.query.filter || 'all'; // 'all', 'personal', 'team'
      const includeIgnored = req.query.includeIgnored === 'true';

      // Create conditions array for query
      const conditions = [];

      // Filter by ownership
      if (filter === 'personal') {
        conditions.push({
          field: 'ownerId',
          operator: '==',
          value: uid
        });
      } else if (filter === 'team') {
        conditions.push({
          field: 'teamId',
          operator: '!=',
          value: null
        });
      } else {
        // For 'all', show personal and team datasets
        // We need to handle this after query since Firestore doesn't support OR conditions directly
      }

      // Include or exclude ignored datasets
      if (!includeIgnored) {
        conditions.push({
          field: 'ignored',
          operator: '==',
          value: false
        });
      }

      // Query options
      const options = {
        orderBy: 'created',
        direction: 'desc'
      };

      // Get datasets
      let datasets = await queryDocuments('datasets', conditions, options);

      // For 'all' filter, we need to filter manually
      if (filter === 'all') {
        datasets = datasets.filter(dataset => {
          return dataset.ownerId === uid || dataset.teamId !== null;
        });
      }

      // Return datasets
      res.status(200).json({
        success: true,
        data: {
          datasets
        }
      });
    } catch (error) {
      logger.error(`Get datasets error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get a specific dataset by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getDataset: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { uid } = req.user;

      // Get dataset
      const dataset = await getDocument('datasets', id);

      if (!dataset) {
        throw new AppError('Dataset not found', 404, 'DATASET_NOT_FOUND');
      }

      // Check ownership or team access
      if (dataset.ownerId !== uid && !dataset.teamId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // TODO: For team datasets, verify user is part of the team

      // Return dataset
      res.status(200).json({
        success: true,
        data: {
          dataset
        }
      });
    } catch (error) {
      logger.error(`Get dataset error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update dataset metadata
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateDataset: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { uid } = req.user;

      // Get dataset
      const dataset = await getDocument('datasets', id);

      if (!dataset) {
        throw new AppError('Dataset not found', 404, 'DATASET_NOT_FOUND');
      }

      // Check ownership
      if (dataset.ownerId !== uid) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Update fields
      const updateData = {};

      if (req.body.name) {
        updateData.name = req.body.name;
      }

      if (req.body.description !== undefined) {
        updateData.description = req.body.description;
      }

      if (req.body.ignored !== undefined) {
        updateData.ignored = !!req.body.ignored;
      }

      if (req.body.metadata) {
        updateData.metadata = {
          ...dataset.metadata,
          ...req.body.metadata
        };
      }

      // Update document
      const updatedDataset = await updateDocument('datasets', id, updateData);

      // Return updated dataset
      res.status(200).json({
        success: true,
        data: {
          dataset: updatedDataset
        }
      });
    } catch (error) {
      logger.error(`Update dataset error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Delete a dataset
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  deleteDataset: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { uid } = req.user;

      // Get dataset
      const dataset = await getDocument('datasets', id);

      if (!dataset) {
        throw new AppError('Dataset not found', 404, 'DATASET_NOT_FOUND');
      }

      // Check ownership
      if (dataset.ownerId !== uid) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Delete file from storage
      if (dataset.fileInfo && dataset.fileInfo.filename) {
        try {
          await storageService.deleteFile(dataset.fileInfo.filename);
        } catch (error) {
          // Log error but continue with document deletion
          logger.warn(`Failed to delete file from storage: ${error.message}`);
        }
      }

      // Delete document
      await deleteDocument('datasets', id);

      // Return success
      res.status(200).json({
        success: true,
        data: {
          message: 'Dataset deleted successfully'
        }
      });
    } catch (error) {
      logger.error(`Delete dataset error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get dataset schema
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getSchema: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { uid } = req.user;

      // Get dataset
      const dataset = await getDocument('datasets', id);

      if (!dataset) {
        throw new AppError('Dataset not found', 404, 'DATASET_NOT_FOUND');
      }

      // Check ownership or team access
      if (dataset.ownerId !== uid && !dataset.teamId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Return schema
      res.status(200).json({
        success: true,
        data: {
          schema: dataset.schema
        }
      });
    } catch (error) {
      logger.error(`Get schema error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update dataset schema
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateSchema: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { uid } = req.user;

      // Get dataset
      const dataset = await getDocument('datasets', id);

      if (!dataset) {
        throw new AppError('Dataset not found', 404, 'DATASET_NOT_FOUND');
      }

      // Check ownership
      if (dataset.ownerId !== uid) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Update schema
      const updatedSchema = {
        ...dataset.schema,
        columns: req.body.columns
      };

      // Update document
      const updatedDataset = await updateDocument('datasets', id, {
        schema: updatedSchema
      });

      // Return updated schema
      res.status(200).json({
        success: true,
        data: {
          schema: updatedDataset.schema
        }
      });
    } catch (error) {
      logger.error(`Update schema error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Generate download URL for dataset
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  downloadDataset: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { uid } = req.user;

      // Get dataset
      const dataset = await getDocument('datasets', id);

      if (!dataset) {
        throw new AppError('Dataset not found', 404, 'DATASET_NOT_FOUND');
      }

      // Check ownership or team access
      if (dataset.ownerId !== uid && !dataset.teamId) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Generate signed URL
      if (!dataset.fileInfo || !dataset.fileInfo.filename) {
        throw new AppError('File information not found', 404, 'FILE_INFO_MISSING');
      }

      const downloadUrl = await storageService.getSignedUrl(
        dataset.fileInfo.filename,
        15 // URL expires in 15 minutes
      );

      // Return download URL
      res.status(200).json({
        success: true,
        data: {
          downloadUrl,
          fileName: dataset.fileInfo.originalName,
          expiresIn: 15 // minutes
        }
      });
    } catch (error) {
      logger.error(`Download dataset error: ${error.message}`);
      next(error);
    }
  }
};

module.exports = datasetController;