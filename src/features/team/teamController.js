// /src/features/team/teamController.js

const { AppError } = require('../../core/errorHandler');
const logger = require('../../core/logger');
const {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments
} = require('../shared/database/dbUtils');
const invitationService = require('./invitationService');

/**
 * Controller for handling team-related operations
 */
const teamController = {
  /**
   * Create a new team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  createTeam: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { name, description, context } = req.body;

      // Create team document
      const teamData = {
        name,
        description: description || '',
        created: new Date(),
        ownerId: uid,
        members: [
          {
            userId: uid,
            role: 'owner',
            joined: new Date()
          }
        ],
        context: context || {
          business: '',
          industry: '',
          preferences: {}
        },
        invitations: []
      };

      const team = await createDocument('teams', teamData);

      // Update user with team ID
      await updateDocument('users', uid, {
        teamId: team.id
      });

      res.status(201).json({
        success: true,
        data: {
          team
        }
      });
    } catch (error) {
      logger.error(`Error creating team: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get all teams for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getTeams: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Find teams where user is a member
      const conditions = [
        {
          field: 'members',
          operator: 'array-contains',
          value: { userId: uid }
        }
      ];

      const teams = await queryDocuments('teams', conditions);

      res.status(200).json({
        success: true,
        data: {
          teams
        }
      });
    } catch (error) {
      logger.error(`Error getting teams: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get a specific team by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getTeamById: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;

      // Get team
      const team = await getDocument('teams', id);

      if (!team) {
        throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
      }

      // Check if user is a member
      const isMember = team.members.some(member => member.userId === uid);
      if (!isMember) {
        throw new AppError('You are not a member of this team', 403, 'ACCESS_DENIED');
      }

      res.status(200).json({
        success: true,
        data: {
          team
        }
      });
    } catch (error) {
      logger.error(`Error getting team: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update a team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateTeam: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      const { name, description, context } = req.body;

      // Get team
      const team = await getDocument('teams', id);

      if (!team) {
        throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
      }

      // Check if user is the owner
      if (team.ownerId !== uid) {
        throw new AppError('Only the team owner can update the team', 403, 'ACCESS_DENIED');
      }

      // Update fields
      const updateData = {};

      if (name) {
        updateData.name = name;
      }

      if (description !== undefined) {
        updateData.description = description;
      }

      if (context) {
        updateData.context = {
          ...team.context,
          ...context
        };
      }

      // Update team
      const updatedTeam = await updateDocument('teams', id, updateData);

      res.status(200).json({
        success: true,
        data: {
          team: updatedTeam
        }
      });
    } catch (error) {
      logger.error(`Error updating team: ${error.message}`);
      next(error);
    }
  },

  /**
   * Delete a team
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  deleteTeam: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;

      // Get team
      const team = await getDocument('teams', id);

      if (!team) {
        throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
      }

      // Check if user is the owner
      if (team.ownerId !== uid) {
        throw new AppError('Only the team owner can delete the team', 403, 'ACCESS_DENIED');
      }

      // Remove team ID from all members
      for (const member of team.members) {
        try {
          await updateDocument('users', member.userId, {
            teamId: null
          });
        } catch (error) {
          logger.warn(`Failed to update teamId for user ${member.userId}: ${error.message}`);
        }
      }

      // Delete team
      await deleteDocument('teams', id);

      res.status(200).json({
        success: true,
        data: {
          message: 'Team deleted successfully'
        }
      });
    } catch (error) {
      logger.error(`Error deleting team: ${error.message}`);
      next(error);
    }
  },

  /**
   * Add a team member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  addMember: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      const { userId, role = 'member' } = req.body;

      // Get team
      const team = await getDocument('teams', id);

      if (!team) {
        throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
      }

      // Check if user is the owner or admin
      const currentMember = team.members.find(member => member.userId === uid);
      if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
        throw new AppError('Only the team owner or admin can add members', 403, 'ACCESS_DENIED');
      }

      // Check if user exists
      const userToAdd = await getDocument('users', userId);
      if (!userToAdd) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if user is already a member
      if (team.members.some(member => member.userId === userId)) {
        throw new AppError('User is already a member of this team', 400, 'ALREADY_MEMBER');
      }

      // Add member to team
      const newMembers = [...team.members, {
        userId,
        role,
        joined: new Date()
      }];

      // Update team
      await updateDocument('teams', id, {
        members: newMembers
      });

      // Update user's teamId
      await updateDocument('users', userId, {
        teamId: id
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Member added successfully'
        }
      });
    } catch (error) {
      logger.error(`Error adding team member: ${error.message}`);
      next(error);
    }
  },

  /**
   * Remove a team member
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  removeMember: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id, userId } = req.params;

      // Get team
      const team = await getDocument('teams', id);

      if (!team) {
        throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
      }

      // Check if user is the owner or admin
      const currentMember = team.members.find(member => member.userId === uid);
      if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
        throw new AppError('Only the team owner or admin can remove members', 403, 'ACCESS_DENIED');
      }

      // Cannot remove the owner
      if (userId === team.ownerId) {
        throw new AppError('Cannot remove the team owner', 400, 'CANNOT_REMOVE_OWNER');
      }

      // Check if user is a member
      if (!team.members.some(member => member.userId === userId)) {
        throw new AppError('User is not a member of this team', 400, 'NOT_A_MEMBER');
      }

      // Remove member from team
      const newMembers = team.members.filter(member => member.userId !== userId);

      // Update team
      await updateDocument('teams', id, {
        members: newMembers
      });

      // Update user's teamId
      await updateDocument('users', userId, {
        teamId: null
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Member removed successfully'
        }
      });
    } catch (error) {
      logger.error(`Error removing team member: ${error.message}`);
      next(error);
    }
  },

  /**
   * Send a team invitation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  sendInvitation: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      const { email, message, role = 'member' } = req.body;

      // Get team
      const team = await getDocument('teams', id);

      if (!team) {
        throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
      }

      // Check if user is the owner or admin
      const currentMember = team.members.find(member => member.userId === uid);
      if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
        throw new AppError('Only the team owner or admin can send invitations', 403, 'ACCESS_DENIED');
      }

      // Check if invitation already exists
      if (team.invitations.some(inv => inv.email === email)) {
        throw new AppError('Invitation already sent to this email', 400, 'INVITATION_EXISTS');
      }

      // Send invitation
      const invitation = await invitationService.createInvitation(team, email, uid, message, role);

      // Update team with invitation
      const newInvitations = [...team.invitations, invitation];
      await updateDocument('teams', id, {
        invitations: newInvitations
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Invitation sent successfully',
          invitation
        }
      });
    } catch (error) {
      logger.error(`Error sending invitation: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get all pending invitations
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getInvitations: async (req, res, next) => {
    try {
      const { email } = req.user;

      // Query all teams for invitations matching the user's email
      const allTeams = await queryDocuments('teams', []);

      const invitations = [];

      // Filter teams with invitations for this user
      allTeams.forEach(team => {
        team.invitations.forEach(invite => {
          if (invite.email === email && invite.status === 'pending') {
            invitations.push({
              invitationId: invite.id,
              teamId: team.id,
              teamName: team.name,
              invitedBy: invite.invitedBy,
              role: invite.role,
              expires: invite.expires,
              message: invite.message
            });
          }
        });
      });

      res.status(200).json({
        success: true,
        data: {
          invitations
        }
      });
    } catch (error) {
      logger.error(`Error getting invitations: ${error.message}`);
      next(error);
    }
  },

  /**
   * Accept a team invitation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  acceptInvitation: async (req, res, next) => {
    try {
      const { uid, email } = req.user;
      const { id } = req.params;

      // Get the team
      const team = await getDocument('teams', id);

      if (!team) {
        throw new AppError('Team not found', 404, 'TEAM_NOT_FOUND');
      }

      // Find the invitation
      const invitationIndex = team.invitations.findIndex(
        inv => inv.email === email && inv.status === 'pending'
      );

      if (invitationIndex === -1) {
        throw new AppError('Invitation not found or already processed', 404, 'INVITATION_NOT_FOUND');
      }

      const invitation = team.invitations[invitationIndex];

      // Check if invitation has expired
      if (new Date(invitation.expires) < new Date()) {
        throw new AppError('Invitation has expired', 400, 'INVITATION_EXPIRED');
      }

      // Update invitation status
      team.invitations[invitationIndex].status = 'accepted';

      // Add user to team members
      const newMember = {
        userId: uid,
        role: invitation.role,
        joined: new Date()
      };

      const updatedMembers = [...team.members, newMember];

      // Update team
      await updateDocument('teams', id, {
        members: updatedMembers,
        invitations: team.invitations
      });

      // Update user's teamId
      await updateDocument('users', uid, {
        teamId: id
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Invitation accepted successfully',
          team: {
            id: team.id,
            name: team.name,
            role: invitation.role
          }
        }
      });
    } catch (error) {
      logger.error(`Error accepting invitation: ${error.message}`);
      next(error);
    }
  }
};

module.exports = teamController;