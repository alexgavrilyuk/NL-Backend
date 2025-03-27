// /src/features/auth/authMiddleware.js

const { admin } = require('../../core/database');
const { AppError } = require('../../core/errorHandler');
const logger = require('../../core/logger');
const { getDocument } = require('../shared/database/dbUtils');

/**
 * Authentication middleware to verify Firebase tokens and protect routes
 */
const authMiddleware = {
  /**
   * Verify Firebase authentication token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  verifyToken: async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('Authentication token is required', 401, 'MISSING_TOKEN');
      }

      const token = authHeader.split('Bearer ')[1];

      // Verify the token with Firebase
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Get user from Firestore
      const user = await getDocument('users', decodedToken.uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Add user data to request object
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        ...user
      };

      next();
    } catch (error) {
      // Handle Firebase Auth specific errors
      if (error.code === 'auth/id-token-expired') {
        return next(new AppError('Token has expired', 401, 'TOKEN_EXPIRED'));
      }
      if (error.code === 'auth/id-token-revoked') {
        return next(new AppError('Token has been revoked', 401, 'TOKEN_REVOKED'));
      }
      if (error.code === 'auth/invalid-id-token') {
        return next(new AppError('Invalid authentication token', 401, 'INVALID_TOKEN'));
      }

      logger.error(`Token verification error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Check if user has an active subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  checkSubscription: (req, res, next) => {
    try {
      const { subscription } = req.user;

      // Check if user has an active subscription or trial
      const hasActiveSubscription = subscription.status === 'active';
      const hasActiveTrial = subscription.trialEnd && new Date(subscription.trialEnd) > new Date();

      if (!hasActiveSubscription && !hasActiveTrial) {
        throw new AppError('Active subscription required', 403, 'SUBSCRIPTION_REQUIRED');
      }

      next();
    } catch (error) {
      logger.error(`Subscription check error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Check if user has admin role
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  requireAdmin: (req, res, next) => {
    try {
      const { role } = req.user;

      if (role !== 'admin') {
        throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED');
      }

      next();
    } catch (error) {
      logger.error(`Admin check error: ${error.message}`);
      next(error);
    }
  }
};

module.exports = authMiddleware;