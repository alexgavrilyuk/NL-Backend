// /src/features/datasets/storageService.js

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../../core/config');
const logger = require('../../core/logger');
const { AppError } = require('../../core/errorHandler');

/**
 * Google Cloud Storage service for dataset file management
 */
class StorageService {
  constructor() {
    this.initializeStorage();
  }

  /**
   * Initialize Google Cloud Storage client
   */
  initializeStorage() {
    try {
      // Initialize storage with credentials
      const options = {};

      // If keyfile is specified, use it
      if (config.storage.keyFilename) {
        options.keyFilename = config.storage.keyFilename;
      }

      // If projectId is specified, use it
      if (config.storage.projectId) {
        options.projectId = config.storage.projectId;
      }

      this.storage = new Storage(options);
      this.bucketName = config.storage.bucketName;
      logger.info('Google Cloud Storage initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize Google Cloud Storage: ${error.message}`);
      // Don't throw error here, let operations fail individually
    }
  }

  /**
   * Get or create the storage bucket
   * @returns {Promise<Bucket>} GCS bucket
   */
  async getBucket() {
    try {
      const bucket = this.storage.bucket(this.bucketName);

      // Check if bucket exists
      const [exists] = await bucket.exists();

      if (!exists) {
        if (config.server.env === 'production') {
          throw new AppError('Storage bucket does not exist', 500, 'BUCKET_NOT_FOUND');
        } else {
          // In development, try to create the bucket
          logger.info(`Creating bucket: ${this.bucketName}`);
          await this.storage.createBucket(this.bucketName);
        }
      }

      return bucket;
    } catch (error) {
      logger.error(`Error accessing storage bucket: ${error.message}`);
      throw new AppError('Storage service unavailable', 503, 'STORAGE_UNAVAILABLE');
    }
  }

  /**
   * Upload a file to Google Cloud Storage
   * @param {Object} file - File object from multer
   * @param {string} userId - User ID who owns the file
   * @returns {Promise<Object>} Upload result with file URL and metadata
   */
  async uploadFile(file, userId) {
    try {
      const bucket = await this.getBucket();

      // Generate a unique filename to prevent collisions
      const filename = `${userId}/${uuidv4()}-${path.basename(file.originalname)}`;

      // Create a file object in the bucket
      const blob = bucket.file(filename);

      // Create a write stream
      const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            userId: userId,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      // Return a promise that resolves on completion
      return new Promise((resolve, reject) => {
        blobStream.on('error', (error) => {
          logger.error(`Error uploading file: ${error.message}`);
          reject(new AppError('File upload failed', 500, 'UPLOAD_FAILED'));
        });

        blobStream.on('finish', async () => {
          // Make the file public (or set appropriate access)
          try {
            // For production, you might want to use signed URLs instead
            if (config.server.env !== 'production') {
              await blob.makePublic();
            }

            // Get the public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${filename}`;

            resolve({
              filename,
              originalName: file.originalname,
              storageUrl: publicUrl,
              contentType: file.mimetype,
              size: file.size
            });
          } catch (error) {
            logger.error(`Error setting file permissions: ${error.message}`);
            reject(new AppError('File upload failed', 500, 'UPLOAD_FAILED'));
          }
        });

        // If file is a buffer, write it directly
        if (file.buffer) {
          blobStream.end(file.buffer);
        } else {
          // Otherwise, reject with error
          reject(new AppError('Invalid file format', 400, 'INVALID_FILE'));
        }
      });
    } catch (error) {
      logger.error(`Storage service error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a signed URL for file download
   * @param {string} filename - The filename in storage
   * @param {number} expiresIn - URL expiration time in minutes
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(filename, expiresIn = 15) {
    try {
      const bucket = await this.getBucket();
      const file = bucket.file(filename);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      }

      // Generate a signed URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 60 * 1000 // Convert minutes to milliseconds
      });

      return url;
    } catch (error) {
      logger.error(`Error generating signed URL: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param {string} filename - The filename in storage
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteFile(filename) {
    try {
      const bucket = await this.getBucket();
      const file = bucket.file(filename);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      }

      // Delete the file
      await file.delete();

      return true;
    } catch (error) {
      logger.error(`Error deleting file: ${error.message}`);
      throw error;
    }
  }
}

// Export a singleton instance
module.exports = new StorageService();