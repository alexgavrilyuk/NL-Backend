// /src/features/auth/authController.js

const { admin } = require('../../core/database');
const { AppError } = require('../../core/errorHandler');
const logger = require('../../core/logger');
const { createDocumentWithId, getDocument } = require('../shared/database/dbUtils');

/**
 * Authentication controller for handling user authentication operations
 */
const authController = {
  /**
   * Register a new user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  register: async (req, res, next) => {
    try {
      const { email, password, displayName } = req.body;

      // Validate required fields
      if (!email || !password) {
        throw new AppError('Email and password are required', 400, 'INVALID_INPUT');
      }

      // Create user in Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        emailVerified: false,
      });

      logger.info(`User created with UID: ${userRecord.uid}`);

      // Create user document in Firestore
      const userData = {
        email,
        displayName: displayName || email.split('@')[0],
        created: new Date(),
        lastLogin: new Date(),
        role: 'user',
        preferences: {
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          theme: 'light',
          language: 'en',
        },
        onboarding: {
          completed: false,
          lastStep: 0,
          showTutorial: true,
        },
        subscription: {
          plan: null,
          status: 'inactive',
          trialEnd: null,
        },
      };

      await createDocumentWithId('users', userRecord.uid, userData);

      // Return success response
      res.status(201).json({
        success: true,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        },
      });
    } catch (error) {
      // Handle Firebase Auth specific errors
      if (error.code === 'auth/email-already-exists') {
        return next(new AppError('Email is already in use', 400, 'EMAIL_IN_USE'));
      }
      if (error.code === 'auth/invalid-email') {
        return next(new AppError('Invalid email format', 400, 'INVALID_EMAIL'));
      }
      if (error.code === 'auth/weak-password') {
        return next(new AppError('Password is too weak', 400, 'WEAK_PASSWORD'));
      }

      logger.error(`Registration error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Process user login
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  login: async (req, res, next) => {
    try {
      // Note: Firebase Authentication is handled on the client side
      // This endpoint is for validating the token and returning user data

      // User data is available from the authMiddleware in req.user
      const { uid } = req.user;

      // Get user from Firestore
      const userData = await getDocument('users', uid);

      if (!userData) {
        // Create user document if it doesn't exist (for users created outside this system)
        const firebaseUser = await admin.auth().getUser(uid);

        const newUserData = {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          created: new Date(),
          lastLogin: new Date(),
          role: 'user',
          preferences: {
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            theme: 'light',
            language: 'en',
          },
          onboarding: {
            completed: false,
            lastStep: 0,
            showTutorial: true,
          },
          subscription: {
            plan: null,
            status: 'inactive',
            trialEnd: null,
          },
        };

        await createDocumentWithId('users', uid, newUserData);

        res.status(200).json({
          success: true,
          data: {
            user: {
              uid,
              ...newUserData
            }
          }
        });

        return;
      }

      // Update last login time
      await admin.firestore().collection('users').doc(uid).update({
        lastLogin: new Date()
      });

      // Return user data
      res.status(200).json({
        success: true,
        data: {
          user: userData
        }
      });
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Process user logout
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  logout: (req, res) => {
    // Note: Since we're using Firebase, token revocation happens on the client side
    // Server-side we just acknowledge the logout
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  },

  /**
   * Initiates password reset process
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  forgotPassword: async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        throw new AppError('Email is required', 400, 'INVALID_INPUT');
      }

      // Send password reset email using Firebase
      await admin.auth().generatePasswordResetLink(email);

      res.status(200).json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      logger.error(`Forgot password error: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get the current user's information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getCurrentUser: (req, res) => {
    // User data is available from the authMiddleware in req.user
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  }
};

module.exports = authController;