// /src/features/aiProcessing/promptModels.js

const Joi = require('joi');

/**
 * Validation schemas for prompt-related operations
 */
const promptSchemas = {
  // Create new prompt schema
  createPrompt: Joi.object({
    prompt: Joi.string().required().min(10).max(1000).messages({
      'string.empty': 'Prompt text is required',
      'string.min': 'Prompt must be at least 10 characters long',
      'string.max': 'Prompt must be at most 1000 characters long',
      'any.required': 'Prompt text is required'
    }),
    datasetIds: Joi.array().items(Joi.string()).min(0).default([]).messages({
      'array.base': 'Dataset IDs must be an array'
    }),
    settings: Joi.object({
      visualizationType: Joi.string().valid('auto', 'bar', 'line', 'pie', 'table', 'mixed').default('auto'),
      includeInsights: Joi.boolean().default(true),
      language: Joi.string().default('en')
    }).default({
      visualizationType: 'auto',
      includeInsights: true,
      language: 'en'
    })
  }),

  // Execute prompt schema
  executePrompt: Joi.object({
    executionOptions: Joi.object({
      timeout: Joi.number().integer().min(1000).max(60000).default(30000),
      memoryLimit: Joi.number().integer().min(128).max(1024).default(512)
    }).default({
      timeout: 30000,
      memoryLimit: 512
    })
  })
};

/**
 * Example prompt status values
 */
const PROMPT_STATUS = {
  CREATED: 'created',         // Just created, not processed yet
  PROCESSING: 'processing',   // Being processed by Claude API
  GENERATED: 'generated',     // Code generated, ready for execution
  EXECUTING: 'executing',     // Code is being executed
  COMPLETED: 'completed',     // Execution complete, results available
  FAILED: 'failed'            // Something went wrong
};

module.exports = {
  promptSchemas,
  PROMPT_STATUS
};