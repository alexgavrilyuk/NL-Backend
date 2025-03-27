// /src/features/subscription/subscriptionModels.js

const Joi = require('joi');

/**
 * Validation schemas for subscription-related operations
 */
const subscriptionSchemas = {
  // Activate trial schema
  activateTrial: Joi.object({
    planId: Joi.string().valid('basic', 'professional', 'enterprise').required().messages({
      'any.required': 'Plan ID is required',
      'string.valid': 'Plan ID must be one of: basic, professional, enterprise'
    })
  }),

  // Change plan schema
  changePlan: Joi.object({
    planId: Joi.string().valid('basic', 'professional', 'enterprise').required().messages({
      'any.required': 'Plan ID is required',
      'string.valid': 'Plan ID must be one of: basic, professional, enterprise'
    })
  })
};

module.exports = subscriptionSchemas;