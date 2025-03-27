// /src/features/subscription/subscriptionMiddleware.js

const { AppError } = require('../../core/errorHandler');
const logger = require('../../core/logger');

/**
 * Middleware for subscription-related functionality
 */
const subscriptionMiddleware = {
  /**
   * Check feature access based on subscription plan
   * @param {string} feature - Required feature
   * @returns {Function} Express middleware function
   */
  checkFeatureAccess: (feature) => {
    return (req, res, next) => {
      try {
        const { subscription } = req.user;

        // Define feature access by plan
        // In a real implementation, this would come from a database
        const featureAccess = {
          basic: ['basic_visualizations', 'csv_import', 'excel_import', 'pdf_export', 'max_datasets_5'],
          professional: ['advanced_visualizations', 'csv_import', 'excel_import', 'pdf_export', 'excel_export', 'team_collaboration', 'max_datasets_20', 'max_team_3'],
          enterprise: ['custom_visualizations', 'csv_import', 'excel_import', 'pdf_export', 'excel_export', 'team_collaboration', 'unlimited_datasets', 'unlimited_team']
        };

        // Check if user's plan has access to the requested feature
        const { plan, status } = subscription;

        // If user doesn't have an active subscription or trial
        if (status !== 'active' && status !== 'trial') {
          throw new AppError('Active subscription required', 403, 'SUBSCRIPTION_REQUIRED');
        }

        // Get features for the user's plan
        const planFeatures = featureAccess[plan] || [];

        // Check if requested feature is available in the plan
        if (!planFeatures.includes(feature)) {
          throw new AppError(`Your current plan does not include access to ${feature}`, 403, 'FEATURE_NOT_AVAILABLE');
        }

        next();
      } catch (error) {
        logger.error(`Feature access check error: ${error.message}`);
        next(error);
      }
    };
  },

  /**
   * Check dataset limit based on subscription plan
   * @returns {Function} Express middleware function
   */
  checkDatasetLimit: () => {
    return async (req, res, next) => {
      try {
        const { uid, subscription } = req.user;

        // Define dataset limits by plan
        const datasetLimits = {
          basic: 5,
          professional: 20,
          enterprise: Infinity
        };

        // Check if user's plan has dataset limit
        const { plan, status } = subscription;

        // If user doesn't have an active subscription or trial
        if (status !== 'active' && status !== 'trial') {
          throw new AppError('Active subscription required', 403, 'SUBSCRIPTION_REQUIRED');
        }

        // Get limit for the user's plan
        const limit = datasetLimits[plan] || 0;

        // Count user's datasets
        // In a real implementation, this would query the database
        // For now, we'll assume the user is within limits

        // For demonstration purposes only - in a real implementation,
        // you would count the actual datasets
        const datasetCount = 0; // This would be a real count

        if (datasetCount >= limit) {
          throw new AppError(`You have reached the maximum number of datasets allowed for your plan (${limit})`, 403, 'DATASET_LIMIT_REACHED');
        }

        next();
      } catch (error) {
        logger.error(`Dataset limit check error: ${error.message}`);
        next(error);
      }
    };
  },

  /**
   * Check team member limit based on subscription plan
   * @returns {Function} Express middleware function
   */
  checkTeamMemberLimit: () => {
    return async (req, res, next) => {
      try {
        const { uid, subscription } = req.user;

        // Define team member limits by plan
        const teamLimits = {
          basic: 1, // Only the owner
          professional: 3,
          enterprise: Infinity
        };

        // Check if user's plan has team limit
        const { plan, status } = subscription;

        // If user doesn't have an active subscription or trial
        if (status !== 'active' && status !== 'trial') {
          throw new AppError('Active subscription required', 403, 'SUBSCRIPTION_REQUIRED');
        }

        // Get limit for the user's plan
        const limit = teamLimits[plan] || 0;

        // For demonstration purposes only - in a real implementation,
        // you would count the actual team members
        const teamCount = 0; // This would be a real count

        if (teamCount >= limit) {
          throw new AppError(`You have reached the maximum number of team members allowed for your plan (${limit})`, 403, 'TEAM_LIMIT_REACHED');
        }

        next();
      } catch (error) {
        logger.error(`Team limit check error: ${error.message}`);
        next(error);
      }
    };
  }
};

module.exports = subscriptionMiddleware;