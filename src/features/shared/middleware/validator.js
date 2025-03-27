// src/features/shared/middleware/validator.js

const Joi = require('joi');
const { AppError } = require('../../../core/errorHandler');
const reportSchemas = require('../../reporting/reportModels');
const teamSchemas = require('../../team/teamModels');
const accountSchemas = require('../../account/accountModels'); // Add this line

/**
 * Create validation middleware using Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', { errors: errorDetails }));
    }

    next();
  };
};

/**
 * Common validation schemas
 */
const schemas = {
  // User registration schema
  userRegistration: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required'
    }),
    displayName: Joi.string().optional()
  }),

  // Password reset request schema
  passwordReset: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
  }),

  // Login schema (for future use if needed)
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  // Subscription schemas
  activateTrial: Joi.object({
    planId: Joi.string().valid('basic', 'professional', 'enterprise').required().messages({
      'any.required': 'Plan ID is required',
      'string.valid': 'Plan ID must be one of: basic, professional, enterprise'
    })
  }),

  changePlan: Joi.object({
    planId: Joi.string().valid('basic', 'professional', 'enterprise').required().messages({
      'any.required': 'Plan ID is required',
      'string.valid': 'Plan ID must be one of: basic, professional, enterprise'
    })
  }),

  // Dataset schemas
  uploadDataset: Joi.object({
    name: Joi.string().required().messages({
      'any.required': 'Dataset name is required'
    }),
    description: Joi.string().optional().allow(''),
    metadata: Joi.object({
      business: Joi.string().optional().allow(''),
      timeframe: Joi.string().optional().allow(''),
      context: Joi.string().optional().allow('')
    }).optional()
  }),

  updateDataset: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional().allow(''),
    metadata: Joi.object({
      business: Joi.string().optional().allow(''),
      timeframe: Joi.string().optional().allow(''),
      context: Joi.string().optional().allow('')
    }).optional(),
    ignored: Joi.boolean().optional()
  }),

  updateSchema: Joi.object({
    columns: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('string', 'number', 'boolean', 'date', 'unknown').required(),
        description: Joi.string().optional().allow(''),
        examples: Joi.array().items(Joi.any()).optional()
      })
    ).required()
  }),

  // Report schemas - Import from report models
  createReport: reportSchemas.createReport,
  updateReport: reportSchemas.updateReport,
  exportReport: reportSchemas.exportReport,
  shareReport: reportSchemas.shareReport,

  // Team schemas - Import from team models
  createTeam: teamSchemas.createTeam,
  updateTeam: teamSchemas.updateTeam,
  addMember: teamSchemas.addMember,
  sendInvitation: teamSchemas.sendInvitation,

  // Account schemas - Import from account models
  updateProfile: accountSchemas.updateProfile,
  updateSettings: accountSchemas.updateSettings,
  updatePreferences: accountSchemas.updatePreferences,
  updateOnboarding: accountSchemas.updateOnboarding
};

module.exports = {
  validate,
  schemas
};