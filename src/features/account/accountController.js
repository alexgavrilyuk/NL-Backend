// /src/features/account/accountController.js

const { AppError } = require('../../core/errorHandler');
const logger = require('../../core/logger');
const { getDocument, updateDocument } = require('../shared/database/dbUtils');

/**
 * Controller for handling account-related operations
 */
const accountController = {
  /**
   * Get user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getProfile: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Get user from database to ensure we have the latest data
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Extract profile information
      const profile = {
        displayName: user.displayName || '',
        email: user.email,
        bio: user.bio || '',
        phoneNumber: user.phoneNumber || '',
        position: user.position || '',
        company: user.company || '',
        created: user.created,
        lastLogin: user.lastLogin
      };

      res.status(200).json({
        success: true,
        data: {
          profile
        }
      });
    } catch (error) {
      logger.error(`Error getting user profile: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update user profile
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateProfile: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { displayName, bio, phoneNumber, position, company } = req.body;

      // Create update object with only provided fields
      const updateData = {};

      if (displayName !== undefined) {
        updateData.displayName = displayName;
      }

      if (bio !== undefined) {
        updateData.bio = bio;
      }

      if (phoneNumber !== undefined) {
        updateData.phoneNumber = phoneNumber;
      }

      if (position !== undefined) {
        updateData.position = position;
      }

      if (company !== undefined) {
        updateData.company = company;
      }

      // Update user document
      await updateDocument('users', uid, updateData);

      // Get updated user profile
      const updatedUser = await getDocument('users', uid);

      // Extract updated profile information
      const profile = {
        displayName: updatedUser.displayName || '',
        email: updatedUser.email,
        bio: updatedUser.bio || '',
        phoneNumber: updatedUser.phoneNumber || '',
        position: updatedUser.position || '',
        company: updatedUser.company || '',
        created: updatedUser.created,
        lastLogin: updatedUser.lastLogin
      };

      res.status(200).json({
        success: true,
        data: {
          profile,
          message: 'Profile updated successfully'
        }
      });
    } catch (error) {
      logger.error(`Error updating user profile: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get user settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getSettings: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Get user from database
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Extract settings (with defaults if not set)
      const settings = {
        currency: user.settings?.currency || 'USD',
        dateFormat: user.settings?.dateFormat || 'MM/DD/YYYY',
        timeFormat: user.settings?.timeFormat || '12h',
        theme: user.settings?.theme || 'light',
        language: user.settings?.language || 'en',
        notifications: user.settings?.notifications || {
          email: true,
          app: true
        }
      };

      res.status(200).json({
        success: true,
        data: {
          settings
        }
      });
    } catch (error) {
      logger.error(`Error getting user settings: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update user settings
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateSettings: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { currency, dateFormat, timeFormat, theme, language, notifications } = req.body;

      // Get current user to ensure we have the latest data
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Create current settings object with defaults
      const currentSettings = user.settings || {
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          app: true
        }
      };

      // Create updated settings by merging current with new
      const updatedSettings = {
        ...currentSettings,
        ...(currency !== undefined && { currency }),
        ...(dateFormat !== undefined && { dateFormat }),
        ...(timeFormat !== undefined && { timeFormat }),
        ...(theme !== undefined && { theme }),
        ...(language !== undefined && { language }),
        ...(notifications !== undefined && { notifications })
      };

      // Update user document
      await updateDocument('users', uid, {
        settings: updatedSettings
      });

      res.status(200).json({
        success: true,
        data: {
          settings: updatedSettings,
          message: 'Settings updated successfully'
        }
      });
    } catch (error) {
      logger.error(`Error updating user settings: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get user preferences
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getPreferences: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Get user from database
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Extract preferences (with defaults)
      const preferences = {
        industry: user.preferences?.industry || '',
        businessType: user.preferences?.businessType || '',
        aiContext: user.preferences?.aiContext || {
          financialYear: '',
          reportingPeriod: '',
          companySize: '',
          analysisPreference: 'detailed'
        }
      };

      res.status(200).json({
        success: true,
        data: {
          preferences
        }
      });
    } catch (error) {
      logger.error(`Error getting user preferences: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update user preferences
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updatePreferences: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { industry, businessType, aiContext } = req.body;

      // Get current user to ensure we have the latest data
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Create current preferences object with defaults
      const currentPreferences = user.preferences || {
        industry: '',
        businessType: '',
        aiContext: {
          financialYear: '',
          reportingPeriod: '',
          companySize: '',
          analysisPreference: 'detailed'
        }
      };

      // Create updated preferences by merging current with new
      const updatedPreferences = {
        ...currentPreferences,
        ...(industry !== undefined && { industry }),
        ...(businessType !== undefined && { businessType }),
        ...(aiContext !== undefined && {
          aiContext: {
            ...currentPreferences.aiContext,
            ...aiContext
          }
        })
      };

      // Update user document
      await updateDocument('users', uid, {
        preferences: updatedPreferences
      });

      res.status(200).json({
        success: true,
        data: {
          preferences: updatedPreferences,
          message: 'Preferences updated successfully'
        }
      });
    } catch (error) {
      logger.error(`Error updating user preferences: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get onboarding status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getOnboardingStatus: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Get user from database
      const user = await getDocument('users', uid);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Extract onboarding status (with defaults)
      const onboarding = user.onboarding || {
        completed: false,
        lastStep: 0,
        showTutorial: true
      };

      res.status(200).json({
        success: true,
        data: {
          onboarding
        }
      });
    } catch (error) {
      logger.error(`Error getting onboarding status: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update onboarding status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateOnboardingStatus: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { completed, lastStep, showTutorial } = req.body;

      // Update onboarding status
      const onboarding = {
        completed,
        lastStep,
        showTutorial: showTutorial !== undefined ? showTutorial : true
      };

      // Update user document
      await updateDocument('users', uid, {
        onboarding
      });

      res.status(200).json({
        success: true,
        data: {
          onboarding,
          message: 'Onboarding status updated successfully'
        }
      });
    } catch (error) {
      logger.error(`Error updating onboarding status: ${error.message}`);
      next(error);
    }
  }
};

module.exports = accountController;