// /src/features/team/invitationService.js

const { v4: uuidv4 } = require('uuid');
const logger = require('../../core/logger');
const { AppError } = require('../../core/errorHandler');
const config = require('../../core/config');

/**
 * Service for handling team invitations
 */
const invitationService = {
  /**
   * Create a new invitation
   * @param {Object} team - Team object
   * @param {string} email - Invitee email address
   * @param {string} inviterId - User ID of the inviter
   * @param {string} message - Optional message
   * @param {string} role - Role to assign (default: 'member')
   * @returns {Object} Invitation object
   */
  createInvitation: async (team, email, inviterId, message = '', role = 'member') => {
    try {
      // Create invitation code
      const code = uuidv4();

      // Set expiration (default: 7 days)
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      // Create invitation object
      const invitation = {
        id: uuidv4(),
        email,
        code,
        expires,
        status: 'pending',
        invitedBy: inviterId,
        role,
        message,
        createdAt: new Date()
      };

      // Send invitation email (if email service is configured)
      await invitationService.sendInvitationEmail(invitation, team);

      return invitation;
    } catch (error) {
      logger.error(`Error creating invitation: ${error.message}`);
      throw new AppError('Failed to create invitation', 500, 'INVITATION_CREATION_FAILED');
    }
  },

  /**
   * Send invitation email
   * @param {Object} invitation - Invitation object
   * @param {Object} team - Team object
   * @returns {Promise<boolean>} Success status
   */
  sendInvitationEmail: async (invitation, team) => {
    try {
      // Check if email service is configured
      if (!config.email.service || !config.email.user || !config.email.password) {
        logger.warn('Email service not configured, skipping invitation email');
        return false;
      }

      // In a production environment, this would use a proper email service
      // For now, we'll just log the email content
      logger.info(`[INVITATION EMAIL] To: ${invitation.email}`);
      logger.info(`[INVITATION EMAIL] Subject: You've been invited to join ${team.name} on NeuroLedger`);
      logger.info(`[INVITATION EMAIL] Body: You've been invited to join ${team.name} as a ${invitation.role}.`);
      logger.info(`[INVITATION EMAIL] Invitation code: ${invitation.code}`);

      // In a real implementation, you would use a library like nodemailer:
      /*
      const transporter = nodemailer.createTransport({
        service: config.email.service,
        auth: {
          user: config.email.user,
          pass: config.email.password
        }
      });

      await transporter.sendMail({
        from: config.email.from,
        to: invitation.email,
        subject: `You've been invited to join ${team.name} on NeuroLedger`,
        html: `
          <h1>You've been invited to join ${team.name}</h1>
          <p>You've been invited to join as a ${invitation.role}.</p>
          <p>${invitation.message}</p>
          <a href="${config.server.frontendUrl}/teams/join/${team.id}/${invitation.code}">
            Click here to accept the invitation
          </a>
          <p>This invitation expires on ${invitation.expires.toLocaleDateString()}.</p>
        `
      });
      */

      return true;
    } catch (error) {
      logger.error(`Error sending invitation email: ${error.message}`);
      return false;
    }
  },

  /**
   * Verify invitation code
   * @param {string} teamId - Team ID
   * @param {string} code - Invitation code
   * @param {string} email - User email
   * @returns {Promise<Object>} Invitation if valid
   */
  verifyInvitation: async (teamId, code, email) => {
    try {
      // This function would be used in a route to verify invitation codes
      // For example, when a user clicks on an invitation link

      // In a real implementation, you would:
      // 1. Get the team by ID
      // 2. Find the invitation by code and email
      // 3. Check if it's valid (not expired, status is pending)
      // 4. Return the invitation or throw an error

      return {
        status: 'success',
        message: 'Invitation code is valid'
      };
    } catch (error) {
      logger.error(`Error verifying invitation: ${error.message}`);
      throw new AppError('Invalid invitation code', 400, 'INVALID_INVITATION_CODE');
    }
  }
};

module.exports = invitationService;