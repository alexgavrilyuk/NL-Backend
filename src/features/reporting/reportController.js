// /src/features/reporting/reportController.js

const { AppError } = require('../../core/errorHandler');
const logger = require('../../core/logger');
const {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  queryDocuments
} = require('../shared/database/dbUtils');
const exportService = require('./exportService');

/**
 * Controller for handling report-related operations
 */
const reportController = {
  /**
   * Create a new report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  createReport: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { name, description, promptId, teamId, visualizations, insights } = req.body;

      // Validate that prompt exists
      const prompt = await getDocument('prompts', promptId);
      if (!prompt) {
        throw new AppError('Prompt not found', 404, 'PROMPT_NOT_FOUND');
      }

      // Check if user has access to the prompt
      if (prompt.userId !== uid && prompt.teamId !== teamId) {
        throw new AppError('You do not have access to this prompt', 403, 'ACCESS_DENIED');
      }

      // If team ID is provided, verify user is part of the team
      if (teamId) {
        // In a complete implementation, we would check team membership here
        // For now, we'll assume the client has already validated this
      }

      // Create report document
      const reportData = {
        name,
        description: description || '',
        ownerId: uid,
        teamId: teamId || null,
        promptId,
        created: new Date(),
        modified: new Date(),
        visualizations: visualizations || [],
        insights: insights || [],
        exportHistory: [],
        sharedWith: []
      };

      const report = await createDocument('reports', reportData);

      res.status(201).json({
        success: true,
        data: {
          report
        }
      });
    } catch (error) {
      logger.error(`Error creating report: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get all reports for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getReports: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Query parameters
      const filter = req.query.filter || 'all'; // 'all', 'personal', 'team', 'shared'
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;

      // Build conditions for query
      const conditions = [];

      if (filter === 'personal') {
        conditions.push({
          field: 'ownerId',
          operator: '==',
          value: uid
        });
      } else if (filter === 'team') {
        // For team reports, we'll get reports where teamId is not null
        conditions.push({
          field: 'teamId',
          operator: '!=',
          value: null
        });
      } else if (filter === 'shared') {
        conditions.push({
          field: 'sharedWith',
          operator: 'array-contains',
          value: uid
        });
      } else {
        // For 'all', we'll filter manually after query
      }

      // Query options
      const options = {
        orderBy: 'created',
        direction: 'desc',
        limit: limit
      };

      // Get reports
      let reports = await queryDocuments('reports', conditions, options);

      // For 'all' filter, we need to filter manually
      if (filter === 'all') {
        reports = reports.filter(report => {
          return report.ownerId === uid ||
                 report.teamId !== null ||
                 (report.sharedWith && report.sharedWith.includes(uid));
        });
      }

      // Format response
      const formattedReports = reports.map(report => ({
        id: report.id,
        name: report.name,
        description: report.description,
        created: report.created,
        modified: report.modified,
        ownerId: report.ownerId,
        teamId: report.teamId,
        promptId: report.promptId,
        visualizationCount: report.visualizations ? report.visualizations.length : 0,
        insightCount: report.insights ? report.insights.length : 0,
        isShared: report.sharedWith && report.sharedWith.length > 0
      }));

      res.status(200).json({
        success: true,
        data: {
          reports: formattedReports,
          meta: {
            total: formattedReports.length,
            page,
            limit
          }
        }
      });
    } catch (error) {
      logger.error(`Error getting reports: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get a specific report by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getReport: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;

      // Get report
      const report = await getDocument('reports', id);

      if (!report) {
        throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
      }

      // Check access
      if (report.ownerId !== uid &&
          report.teamId !== req.user.teamId &&
          !(report.sharedWith && report.sharedWith.includes(uid))) {
        throw new AppError('You do not have access to this report', 403, 'ACCESS_DENIED');
      }

      res.status(200).json({
        success: true,
        data: {
          report
        }
      });
    } catch (error) {
      logger.error(`Error getting report: ${error.message}`);
      next(error);
    }
  },

  /**
   * Update a report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  updateReport: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      const { name, description, teamId, visualizations, insights } = req.body;

      // Get report
      const report = await getDocument('reports', id);

      if (!report) {
        throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
      }

      // Check ownership
      if (report.ownerId !== uid) {
        throw new AppError('Only the owner can update this report', 403, 'ACCESS_DENIED');
      }

      // Build update data
      const updateData = {
        modified: new Date()
      };

      if (name !== undefined) {
        updateData.name = name;
      }

      if (description !== undefined) {
        updateData.description = description;
      }

      if (teamId !== undefined) {
        updateData.teamId = teamId;
      }

      if (visualizations !== undefined) {
        updateData.visualizations = visualizations;
      }

      if (insights !== undefined) {
        updateData.insights = insights;
      }

      // Update report
      const updatedReport = await updateDocument('reports', id, updateData);

      res.status(200).json({
        success: true,
        data: {
          report: updatedReport
        }
      });
    } catch (error) {
      logger.error(`Error updating report: ${error.message}`);
      next(error);
    }
  },

  /**
   * Delete a report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  deleteReport: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;

      // Get report
      const report = await getDocument('reports', id);

      if (!report) {
        throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
      }

      // Check ownership
      if (report.ownerId !== uid) {
        throw new AppError('Only the owner can delete this report', 403, 'ACCESS_DENIED');
      }

      // Delete report
      await deleteDocument('reports', id);

      // In a complete implementation, we would also:
      // 1. Delete any exported files from storage
      // 2. Remove any references to this report from other collections

      res.status(200).json({
        success: true,
        data: {
          message: 'Report deleted successfully'
        }
      });
    } catch (error) {
      logger.error(`Error deleting report: ${error.message}`);
      next(error);
    }
  },

  /**
   * Export a report to PDF or image
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  exportReport: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      const { format = 'pdf', includeInsights = true, quality = 'medium' } = req.body;

      // Get report
      const report = await getDocument('reports', id);

      if (!report) {
        throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
      }

      // Check access
      if (report.ownerId !== uid &&
          report.teamId !== req.user.teamId &&
          !(report.sharedWith && report.sharedWith.includes(uid))) {
        throw new AppError('You do not have access to this report', 403, 'ACCESS_DENIED');
      }

      // Generate export
      const exportResult = await exportService.exportReport(report, format, {
        includeInsights,
        quality
      });

      // Update report with export history
      const exportHistory = report.exportHistory || [];
      exportHistory.push({
        format,
        url: exportResult.fileUrl,
        created: new Date(),
        expiresAt: exportResult.expiresAt
      });

      await updateDocument('reports', id, {
        exportHistory: exportHistory.slice(-5) // Keep only the 5 most recent exports
      });

      res.status(200).json({
        success: true,
        data: {
          exportUrl: exportResult.fileUrl,
          format,
          expiresAt: exportResult.expiresAt
        }
      });
    } catch (error) {
      logger.error(`Error exporting report: ${error.message}`);
      next(error);
    }
  },

  /**
   * Share a report with other users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  shareReport: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      const { emails, message, permissions = 'view' } = req.body;

      // Get report
      const report = await getDocument('reports', id);

      if (!report) {
        throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
      }

      // Check ownership
      if (report.ownerId !== uid) {
        throw new AppError('Only the owner can share this report', 403, 'ACCESS_DENIED');
      }

      // In a complete implementation, we would:
      // 1. Look up users by email
      // 2. Send email notifications
      // 3. Record sharing details with permissions

      // For now, we'll just update the sharedWith array
      // This is a simplified implementation
      const currentShared = report.sharedWith || [];

      // Get user IDs for the provided emails (in a real implementation)
      // For now, we'll just use the emails as placeholders
      const sharedWith = [...new Set([...currentShared, ...emails])];

      // Update report
      await updateDocument('reports', id, {
        sharedWith
      });

      res.status(200).json({
        success: true,
        data: {
          message: 'Report shared successfully',
          sharedWith
        }
      });
    } catch (error) {
      logger.error(`Error sharing report: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get drill-down data for a report section
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getDrillDownData: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      const { sectionId, filters } = req.query;

      // Get report
      const report = await getDocument('reports', id);

      if (!report) {
        throw new AppError('Report not found', 404, 'REPORT_NOT_FOUND');
      }

      // Check access
      if (report.ownerId !== uid &&
          report.teamId !== req.user.teamId &&
          !(report.sharedWith && report.sharedWith.includes(uid))) {
        throw new AppError('You do not have access to this report', 403, 'ACCESS_DENIED');
      }

      // In a complete implementation, we would:
      // 1. Get the prompt execution results associated with this report
      // 2. Use the filters to generate drill-down data
      // 3. Format the response appropriately

      // For now, we'll return a placeholder response
      res.status(200).json({
        success: true,
        data: {
          message: 'Drill-down functionality will be implemented in a future update',
          reportId: id,
          sectionId,
          filters
        }
      });
    } catch (error) {
      logger.error(`Error getting drill-down data: ${error.message}`);
      next(error);
    }
  }
};

module.exports = reportController;