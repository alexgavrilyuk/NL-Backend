// /src/features/subscription/subscriptionController.js

const { AppError } = require('../../core/errorHandler');
const logger = require('../../core/logger');
const { updateDocument, getDocument } = require('../shared/database/dbUtils');

/**
 * Subscription controller for handling subscription operations
 */
const subscriptionController = {
  /**
   * Get all available subscription plans
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getPlans: async (req, res, next) => {
    try {
      // In a real implementation, these would come from a database
      // For now, we'll use hardcoded plans as per requirements
      const plans = [
        {
          id: 'basic',
          name: 'Basic Plan',
          description: 'Essential analytics for small businesses',
          price: 29,
          interval: 'month',
          features: [
            'Up to 5 datasets',
            'Basic visualizations',
            'CSV/Excel imports',
            'Email support'
          ]
        },
        {
          id: 'professional',
          name: 'Professional Plan',
          description: 'Advanced analytics for growing businesses',
          price: 99,
          interval: 'month',
          features: [
            'Up to 20 datasets',
            'Advanced visualizations',
            'Team collaboration (up to 3 members)',
            'Priority email support',
            'Export to PDF/Excel'
          ]
        },
        {
          id: 'enterprise',
          name: 'Enterprise Plan',
          description: 'Comprehensive analytics for large organizations',
          price: 249,
          interval: 'month',
          features: [
            'Unlimited datasets',
            'Custom visualizations',
            'Team collaboration (unlimited members)',
            'Dedicated support',
            'Advanced exports',
            'Custom integrations'
          ]
        }
      ];

      res.status(200).json({
        success: true,
        data: {
          plans
        }
      });
    } catch (error) {
      logger.error(`Error getting subscription plans: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get current user's subscription status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getStatus: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Get user from database to ensure we have latest subscription info
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const { subscription } = user;

      // Calculate days left in trial if applicable
      let trialDaysLeft = 0;
      if (subscription.trialEnd) {
        const trialEnd = new Date(subscription.trialEnd);
        const today = new Date();
        const diffTime = trialEnd - today;
        trialDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      res.status(200).json({
        success: true,
        data: {
          subscription: {
            ...subscription,
            trialDaysLeft: trialDaysLeft > 0 ? trialDaysLeft : 0
          }
        }
      });
    } catch (error) {
      logger.error(`Error getting subscription status: ${error.message}`);
      next(error);
    }
  },

  /**
   * Activate a trial for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  activateTrial: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { planId } = req.body;

      // Validate plan ID
      if (!planId) {
        throw new AppError('Plan ID is required', 400, 'INVALID_INPUT');
      }

      // Get user from database
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if user already has an active subscription or trial
      const { subscription } = user;

      if (subscription.status === 'active') {
        throw new AppError('User already has an active subscription', 400, 'ACTIVE_SUBSCRIPTION_EXISTS');
      }

      if (subscription.trialEnd && new Date(subscription.trialEnd) > new Date()) {
        throw new AppError('User already has an active trial', 400, 'ACTIVE_TRIAL_EXISTS');
      }

      // Set trial period (90 days as specified in requirements)
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 90);

      // Update user's subscription
      const updatedSubscription = {
        plan: planId,
        status: 'trial',
        trialEnd: trialEnd,
        trialStarted: new Date(),
        features: [], // This would be populated based on the plan in a real implementation
      };

      // Update user document
      await updateDocument('users', uid, {
        subscription: updatedSubscription
      });

      res.status(200).json({
        success: true,
        data: {
          subscription: {
            ...updatedSubscription,
            trialDaysLeft: 90
          },
          message: 'Trial activated successfully'
        }
      });
    } catch (error) {
      logger.error(`Error activating trial: ${error.message}`);
      next(error);
    }
  },

  /**
   * Change user's subscription plan
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  changePlan: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { planId } = req.body;

      // Validate plan ID
      if (!planId) {
        throw new AppError('Plan ID is required', 400, 'INVALID_INPUT');
      }

      // Get user from database
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // In a real implementation, this would interact with a payment processor
      // For now, we'll just update the subscription status

      // Update user's subscription
      const updatedSubscription = {
        plan: planId,
        status: 'active',
        createdAt: new Date(),
        renewedAt: new Date(),
        expiresAt: null, // Would be calculated based on billing cycle
        features: [], // This would be populated based on the plan in a real implementation
      };

      // Update user document
      await updateDocument('users', uid, {
        subscription: updatedSubscription
      });

      res.status(200).json({
        success: true,
        data: {
          subscription: updatedSubscription,
          message: 'Subscription updated successfully'
        }
      });
    } catch (error) {
      logger.error(`Error changing subscription plan: ${error.message}`);
      next(error);
    }
  },

  /**
   * Cancel user's subscription
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  cancelSubscription: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Get user from database
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Update user's subscription
      const updatedSubscription = {
        plan: user.subscription.plan,
        status: 'cancelled',
        cancelledAt: new Date(),
        expiresAt: new Date(), // In a real implementation, this would be the end of the billing cycle
      };

      // Update user document
      await updateDocument('users', uid, {
        subscription: updatedSubscription
      });

      res.status(200).json({
        success: true,
        data: {
          subscription: updatedSubscription,
          message: 'Subscription cancelled successfully'
        }
      });
    } catch (error) {
      logger.error(`Error cancelling subscription: ${error.message}`);
      next(error);
    }
  }
};

module.exports = subscriptionController;