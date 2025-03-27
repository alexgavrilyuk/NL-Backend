// /src/features/account/accountModels.js

const Joi = require('joi');

/**
 * Validation schemas for account-related operations
 */
const accountSchemas = {
  // Update profile schema
  updateProfile: Joi.object({
    displayName: Joi.string().min(2).max(100).messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name must be at most 100 characters long'
    }),
    bio: Joi.string().allow('').max(500).messages({
      'string.max': 'Bio must be at most 500 characters long'
    }),
    phoneNumber: Joi.string().allow('').max(20).messages({
      'string.max': 'Phone number must be at most 20 characters long'
    }),
    position: Joi.string().allow('').max(100).messages({
      'string.max': 'Position must be at most 100 characters long'
    }),
    company: Joi.string().allow('').max(100).messages({
      'string.max': 'Company must be at most 100 characters long'
    })
  }),

  // Update settings schema
  updateSettings: Joi.object({
    currency: Joi.string().valid(
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'
    ).messages({
      'string.valid': 'Currency must be one of the supported currencies'
    }),
    dateFormat: Joi.string().valid(
      'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'
    ).messages({
      'string.valid': 'Date format must be one of the supported formats'
    }),
    timeFormat: Joi.string().valid('12h', '24h').messages({
      'string.valid': 'Time format must be either 12h or 24h'
    }),
    theme: Joi.string().valid('light', 'dark', 'system').messages({
      'string.valid': 'Theme must be one of: light, dark, system'
    }),
    language: Joi.string().valid('en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh').messages({
      'string.valid': 'Language must be one of the supported languages'
    }),
    notifications: Joi.object({
      email: Joi.boolean().default(true),
      app: Joi.boolean().default(true)
    }).default({
      email: true,
      app: true
    })
  }),

  // Update preferences schema
  updatePreferences: Joi.object({
    industry: Joi.string().allow('').max(100).messages({
      'string.max': 'Industry must be at most 100 characters long'
    }),
    businessType: Joi.string().allow('').max(100).messages({
      'string.max': 'Business type must be at most 100 characters long'
    }),
    aiContext: Joi.object({
      financialYear: Joi.string().allow('').max(20),
      reportingPeriod: Joi.string().allow('').max(50),
      companySize: Joi.string().allow('').max(50),
      analysisPreference: Joi.string().valid('detailed', 'summary', 'visual').default('detailed')
    }).default({
      financialYear: '',
      reportingPeriod: '',
      companySize: '',
      analysisPreference: 'detailed'
    })
  }),

  // Update onboarding schema
  updateOnboarding: Joi.object({
    completed: Joi.boolean().required().messages({
      'any.required': 'Completed status is required'
    }),
    lastStep: Joi.number().integer().min(0).required().messages({
      'any.required': 'Last step is required',
      'number.base': 'Last step must be a number',
      'number.integer': 'Last step must be an integer',
      'number.min': 'Last step must be at least 0'
    }),
    showTutorial: Joi.boolean().default(true)
  })
};

module.exports = accountSchemas;