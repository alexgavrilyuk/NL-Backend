// /src/features/team/teamRoutes.js

const express = require('express');
const teamController = require('./teamController');
const teamSchemas = require('./teamModels');
const { validate } = require('../shared/middleware/validator');
const authMiddleware = require('../auth/authMiddleware');
const subscriptionMiddleware = require('../subscription/subscriptionMiddleware');
const requestLogger = require('../shared/middleware/requestLogger');

const router = express.Router();

// Apply request logger to all team routes
router.use(requestLogger);

// Apply authentication to all team routes
router.use(authMiddleware.verifyToken);

/**
 * Team routes
 */

// Create a new team (requires authentication and team collaboration feature)
router.post(
  '/',
  authMiddleware.checkSubscription,
  subscriptionMiddleware.checkFeatureAccess('team_collaboration'),
  validate(teamSchemas.createTeam),
  teamController.createTeam
);

// Get all teams for current user
router.get(
  '/',
  teamController.getTeams
);

// Get a specific team by ID
router.get(
  '/:id',
  teamController.getTeamById
);

// Update a team
router.put(
  '/:id',
  validate(teamSchemas.updateTeam),
  teamController.updateTeam
);

// Delete a team
router.delete(
  '/:id',
  teamController.deleteTeam
);

// Add a team member (requires the team collaboration feature)
router.post(
  '/:id/members',
  subscriptionMiddleware.checkFeatureAccess('team_collaboration'),
  subscriptionMiddleware.checkTeamMemberLimit(),
  validate(teamSchemas.addMember),
  teamController.addMember
);

// Remove a team member
router.delete(
  '/:id/members/:userId',
  teamController.removeMember
);

// Send a team invitation
router.post(
  '/:id/invite',
  subscriptionMiddleware.checkFeatureAccess('team_collaboration'),
  validate(teamSchemas.sendInvitation),
  teamController.sendInvitation
);

// Get all pending invitations for current user
router.get(
  '/invitations',
  teamController.getInvitations
);

// Accept a team invitation
router.post(
  '/invitations/:id/accept',
  teamController.acceptInvitation
);

module.exports = router;