// /src/features/reporting/reportModels.js

const Joi = require('joi');

/**
 * Validation schemas for report-related operations
 */
const reportSchemas = {
  // Create new report schema
  createReport: Joi.object({
    name: Joi.string().required().min(3).max(100).messages({
      'string.empty': 'Report name is required',
      'string.min': 'Report name must be at least 3 characters long',
      'string.max': 'Report name must be at most 100 characters long',
      'any.required': 'Report name is required'
    }),
    description: Joi.string().allow('').max(500).default('').messages({
      'string.max': 'Description must be at most 500 characters long'
    }),
    promptId: Joi.string().required().messages({
      'any.required': 'Prompt ID is required'
    }),
    teamId: Joi.string().allow(null).default(null),
    visualizations: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('bar', 'line', 'pie', 'table', 'kpi', 'custom').required(),
        title: Joi.string().required(),
        description: Joi.string().allow(''),
        data: Joi.object().required(),
        config: Joi.object().default({})
      })
    ).default([]),
    insights: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        content: Joi.string().required(),
        importance: Joi.number().integer().min(1).max(5).default(3)
      })
    ).default([])
  }),

  // Update report schema
  updateReport: Joi.object({
    name: Joi.string().min(3).max(100).messages({
      'string.min': 'Report name must be at least 3 characters long',
      'string.max': 'Report name must be at most 100 characters long'
    }),
    description: Joi.string().allow('').max(500).messages({
      'string.max': 'Description must be at most 500 characters long'
    }),
    teamId: Joi.string().allow(null),
    visualizations: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('bar', 'line', 'pie', 'table', 'kpi', 'custom').required(),
        title: Joi.string().required(),
        description: Joi.string().allow(''),
        data: Joi.object().required(),
        config: Joi.object().default({})
      })
    ),
    insights: Joi.array().items(
      Joi.object({
        title: Joi.string().required(),
        content: Joi.string().required(),
        importance: Joi.number().integer().min(1).max(5).default(3)
      })
    )
  }),

  // Export report schema
  exportReport: Joi.object({
    format: Joi.string().valid('pdf', 'png', 'jpg').default('pdf').messages({
      'string.valid': 'Format must be one of: pdf, png, jpg'
    }),
    includeInsights: Joi.boolean().default(true),
    quality: Joi.string().valid('low', 'medium', 'high').default('medium')
  }),

  // Share report schema
  shareReport: Joi.object({
    emails: Joi.array().items(
      Joi.string().email().messages({
        'string.email': 'Please provide a valid email address'
      })
    ).min(1).required().messages({
      'array.min': 'At least one email is required',
      'any.required': 'Recipient emails are required'
    }),
    message: Joi.string().allow('').max(500).default('').messages({
      'string.max': 'Message must be at most 500 characters long'
    }),
    permissions: Joi.string().valid('view', 'edit').default('view').messages({
      'string.valid': 'Permissions must be one of: view, edit'
    })
  })
};

module.exports = reportSchemas;