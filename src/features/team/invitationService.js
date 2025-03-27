// /src/features/team/teamModels.js

const Joi = require('joi');

/**
 * Validation schemas for team-related operations
 */
const teamSchemas = {
  // Create team schema
  createTeam: Joi.object({
    name: Joi.string().required().min(3).max(100).messages({
      'string.empty': 'Team name is required',
      'string.min': 'Team name must be at least 3 characters long',
      'string.max': 'Team name must be at most 100 characters long',
      'any.required': 'Team name is required'
    }),
    description: Joi.string().allow('').max(500).default('').messages({
      'string.max': 'Description must be at most 500 characters long'
    }),
    context: Joi.object({
      business: Joi.string().allow(''),
      industry: Joi.string().allow(''),
      preferences: Joi.object().default({})
    }).default({
      business: '',
      industry: '',
      preferences: {}
    })
  }),

  // Update team schema
  updateTeam: Joi.object({
    name: Joi.string().min(3).max(100).messages({
      'string.min': 'Team name must be at least 3 characters long',
      'string.max': 'Team name must be at most 100 characters long'
    }),
    description: Joi.string().allow('').max(500).messages({
      'string.max': 'Description must be at most 500 characters long'
    }),
    context: Joi.object({
      business: Joi.string().allow(''),
      industry: Joi.string().allow(''),
      preferences: Joi.object()
    })
  }),

  // Add member schema
  addMember: Joi.object({
    userId: Joi.string().required().messages({
      'any.required': 'User ID is required'
    }),
    role: Joi.string().valid('member', 'admin').default('member').messages({
      'string.valid': 'Role must be one of: member, admin'
    })
  }),

  // Send invitation schema
  sendInvitation: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    message: Joi.string().allow('').max(500).default('').messages({
      'string.max': 'Message must be at most 500 characters long'
    }),
    role: Joi.string().valid('member', 'admin').default('member').messages({
      'string.valid': 'Role must be one of: member, admin'
    })
  })
};

module.exports = teamSchemas;