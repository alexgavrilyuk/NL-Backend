// /src/features/datasets/datasetModels.js

const Joi = require('joi');

/**
 * Validation schemas for dataset-related operations
 */
const datasetSchemas = {
  // Dataset upload schema
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

  // Dataset update schema
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

  // Schema update schema
  updateSchema: Joi.object({
    columns: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('string', 'number', 'boolean', 'date', 'unknown').required(),
        description: Joi.string().optional().allow(''),
        examples: Joi.array().items(Joi.any()).optional()
      })
    ).required()
  })
};

module.exports = datasetSchemas;