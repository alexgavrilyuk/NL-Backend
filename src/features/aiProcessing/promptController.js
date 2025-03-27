// /src/features/aiProcessing/promptController.js

const { AppError } = require('../../core/errorHandler');
const logger = require('../../core/logger');
const { createDocument, getDocument, updateDocument, queryDocuments } = require('../shared/database/dbUtils');
const claudeService = require('./claudeService');
const contextEnricher = require('./contextEnricher');
const { PROMPT_STATUS } = require('./promptModels');

/**
 * Controller for handling prompt-related operations
 */
const promptController = {
  /**
   * Create a new prompt
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  createPrompt: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { prompt, datasetIds = [], settings = {} } = req.body;

      // Validate prompt
      if (!prompt || prompt.trim() === '') {
        throw new AppError('Prompt text is required', 400, 'INVALID_INPUT');
      }

      // Create prompt document
      const promptData = {
        userId: uid,
        teamId: req.user.teamId || null,
        created: new Date(),
        prompt: prompt,
        datasetIds: datasetIds,
        settings: settings,
        status: PROMPT_STATUS.CREATED,
        enhancedPrompt: null,
        generatedCode: null,
        executionResults: null,
        insights: null,
        error: null
      };

      // Save prompt to database
      const newPrompt = await createDocument('prompts', promptData);

      // Process the prompt asynchronously
      setTimeout(() => {
        processPrompt(newPrompt.id, uid, prompt, datasetIds, req.user)
          .catch(error => {
            logger.error(`Error processing prompt ${newPrompt.id}: ${error.message}`);
          });
      }, 0);

      res.status(201).json({
        success: true,
        data: {
          promptId: newPrompt.id,
          status: PROMPT_STATUS.CREATED,
          message: 'Prompt created and processing started'
        }
      });
    } catch (error) {
      logger.error(`Error creating prompt: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get a list of prompts for the current user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getPrompts: async (req, res, next) => {
    try {
      const { uid } = req.user;

      // Query parameters
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;

      // Fetch prompts from database
      const conditions = [
        { field: 'userId', operator: '==', value: uid }
      ];

      // If user has a team, include team prompts
      if (req.user.teamId) {
        conditions.push({ field: 'teamId', operator: '==', value: req.user.teamId });
      }

      const options = {
        orderBy: 'created',
        direction: 'desc',
        limit: limit
      };

      const prompts = await queryDocuments('prompts', conditions, options);

      // Map to response format
      const promptList = prompts.map(prompt => ({
        id: prompt.id,
        prompt: prompt.prompt,
        status: prompt.status,
        created: prompt.created,
        datasetIds: prompt.datasetIds,
        hasResults: prompt.status === PROMPT_STATUS.COMPLETED,
        hasError: prompt.status === PROMPT_STATUS.FAILED,
        teamId: prompt.teamId
      }));

      res.status(200).json({
        success: true,
        data: {
          prompts: promptList,
          meta: {
            total: promptList.length,
            page,
            limit
          }
        }
      });
    } catch (error) {
      logger.error(`Error getting prompts: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get a specific prompt by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getPromptById: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;

      // Get prompt from database
      const prompt = await getDocument('prompts', id);

      if (!prompt) {
        throw new AppError('Prompt not found', 404, 'PROMPT_NOT_FOUND');
      }

      // Check ownership
      if (prompt.userId !== uid && prompt.teamId !== req.user.teamId) {
        throw new AppError('You do not have access to this prompt', 403, 'ACCESS_DENIED');
      }

      // Format response based on status
      let response = {
        id: prompt.id,
        prompt: prompt.prompt,
        enhancedPrompt: prompt.enhancedPrompt,
        status: prompt.status,
        created: prompt.created,
        settings: prompt.settings,
        datasetIds: prompt.datasetIds,
        teamId: prompt.teamId
      };

      // Include additional fields based on status
      if (prompt.status === PROMPT_STATUS.COMPLETED) {
        // Include results for completed prompts
        response.results = {
          visualizations: prompt.executionResults?.visualizations || [],
          insights: prompt.insights || []
        };
      } else if (prompt.status === PROMPT_STATUS.FAILED) {
        // Include error information for failed prompts
        response.error = prompt.error;
      }

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error(`Error getting prompt by ID: ${error.message}`);
      next(error);
    }
  },

  /**
   * Execute code for a specific prompt
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  executePrompt: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;
      const { executionOptions = {} } = req.body;

      // Get prompt from database
      const prompt = await getDocument('prompts', id);

      if (!prompt) {
        throw new AppError('Prompt not found', 404, 'PROMPT_NOT_FOUND');
      }

      // Check ownership
      if (prompt.userId !== uid && prompt.teamId !== req.user.teamId) {
        throw new AppError('You do not have access to this prompt', 403, 'ACCESS_DENIED');
      }

      // Check if prompt has generated code
      if (prompt.status !== PROMPT_STATUS.GENERATED) {
        throw new AppError(
          'Prompt is not ready for execution',
          400,
          'INVALID_PROMPT_STATE',
          { currentStatus: prompt.status }
        );
      }

      // Update prompt status
      await updateDocument('prompts', id, {
        status: PROMPT_STATUS.EXECUTING
      });

      // Execute code asynchronously
      setTimeout(() => {
        executeCode(id, prompt.generatedCode, prompt.datasetIds, executionOptions, prompt.prompt)
          .catch(error => {
            logger.error(`Error executing prompt ${id}: ${error.message}`);
          });
      }, 0);

      res.status(200).json({
        success: true,
        data: {
          promptId: id,
          status: PROMPT_STATUS.EXECUTING,
          message: 'Execution started'
        }
      });
    } catch (error) {
      logger.error(`Error executing prompt: ${error.message}`);
      next(error);
    }
  },

  /**
   * Get results for a specific prompt
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  getResults: async (req, res, next) => {
    try {
      const { uid } = req.user;
      const { id } = req.params;

      // Get prompt from database
      const prompt = await getDocument('prompts', id);

      if (!prompt) {
        throw new AppError('Prompt not found', 404, 'PROMPT_NOT_FOUND');
      }

      // Check ownership
      if (prompt.userId !== uid && prompt.teamId !== req.user.teamId) {
        throw new AppError('You do not have access to this prompt', 403, 'ACCESS_DENIED');
      }

      // Check if results are available
      if (prompt.status !== PROMPT_STATUS.COMPLETED) {
        throw new AppError(
          'Results not available yet',
          404,
          'RESULTS_NOT_AVAILABLE',
          { currentStatus: prompt.status }
        );
      }

      res.status(200).json({
        success: true,
        data: {
          promptId: id,
          status: prompt.status,
          visualizations: prompt.executionResults?.visualizations || [],
          insights: prompt.insights || []
        }
      });
    } catch (error) {
      logger.error(`Error getting prompt results: ${error.message}`);
      next(error);
    }
  }
};

/**
 * Process a prompt asynchronously
 * @param {string} promptId - Prompt ID
 * @param {string} userId - User ID
 * @param {string} promptText - Original prompt text
 * @param {Array} datasetIds - Dataset IDs
 * @param {Object} user - User object
 */
async function processPrompt(promptId, userId, promptText, datasetIds, user) {
  try {
    // Update status to processing
    await updateDocument('prompts', promptId, {
      status: PROMPT_STATUS.PROCESSING
    });

    // Enhance prompt with context
    logger.info(`Enhancing prompt ${promptId} with context`);
    const enhancedPrompt = await contextEnricher.enhancePrompt(promptText, datasetIds, user);

    // Update prompt with enhanced text
    await updateDocument('prompts', promptId, {
      enhancedPrompt: enhancedPrompt
    });

    // Generate code using Claude API
    logger.info(`Generating code for prompt ${promptId}`);
    const { generatedCode } = await claudeService.generateCode(enhancedPrompt);

    // Update prompt with generated code
    await updateDocument('prompts', promptId, {
      generatedCode: generatedCode,
      status: PROMPT_STATUS.GENERATED
    });

    logger.info(`Prompt ${promptId} processed successfully`);
  } catch (error) {
    logger.error(`Error processing prompt ${promptId}: ${error.message}`);

    // Update prompt with error
    await updateDocument('prompts', promptId, {
      status: PROMPT_STATUS.FAILED,
      error: {
        message: error.message,
        code: error.code || 'PROCESSING_ERROR',
        stage: 'code_generation'
      }
    });
  }
}

/**
 * Execute generated code asynchronously
 * @param {string} promptId - Prompt ID
 * @param {string} code - Generated code to execute
 * @param {Array} datasetIds - Dataset IDs
 * @param {Object} options - Execution options
 * @param {string} originalPrompt - Original prompt text for insight generation
 */
async function executeCode(promptId, code, datasetIds, options, originalPrompt) {
  try {
    // In a production environment, this would use a secure execution environment.
    // For now, we'll implement a simplified version that assumes the code is safe.

    logger.info(`Executing code for prompt ${promptId}`);

    // Fetch datasets
    // This is a simplified version - a real implementation would need more robust data loading
    const datasets = await Promise.all(datasetIds.map(id => getDocument('datasets', id)));
    const validDatasets = datasets.filter(ds => ds !== null);

    // TODO: In a real implementation, we would load the actual dataset contents
    // from Google Cloud Storage here. For now, we'll use sample data if available.
    const datasetSamples = validDatasets.map(ds => ({
      id: ds.id,
      name: ds.name,
      data: ds.schema?.sampleData || []
    }));

    // Prepare execution context
    const executionContext = {
      datasets: datasetSamples,
      options
    };

    // For now, we'll simulate execution
    // In production, this would use VM2, Docker containers, or another secure execution method
    let results;
    try {
      // WARNING: This is not secure and is only for demonstration
      // In a production environment, NEVER execute code like this
      // This should be replaced with a proper secure execution environment

      // Extract the function body from code (simplified)
      const functionBody = code.replace(/^function.*?{/, '').replace(/}$/, '');

      // Create a new Function with the dataset as parameter
      // eslint-disable-next-line no-new-func
      const execFunc = new Function('context', `
        try {
          ${functionBody}
        } catch (error) {
          return { error: error.message };
        }
      `);

      // Execute the function
      results = execFunc(executionContext);

      if (results.error) {
        throw new Error(results.error);
      }
    } catch (execError) {
      logger.error(`Code execution error: ${execError.message}`);
      throw new AppError(`Error executing code: ${execError.message}`, 500, 'CODE_EXECUTION_ERROR');
    }

    // Generate narrative insights if not already included
    let insights = results.insights || [];
    if ((!insights || insights.length === 0) && results.visualizations) {
      logger.info(`Generating narrative insights for prompt ${promptId}`);
      insights = await claudeService.generateInsights(results, originalPrompt);
    }

    // Update prompt with results
    await updateDocument('prompts', promptId, {
      status: PROMPT_STATUS.COMPLETED,
      executionResults: results,
      insights: insights
    });

    logger.info(`Code execution for prompt ${promptId} completed successfully`);
  } catch (error) {
    logger.error(`Error executing code for prompt ${promptId}: ${error.message}`);

    // Update prompt with error
    await updateDocument('prompts', promptId, {
      status: PROMPT_STATUS.FAILED,
      error: {
        message: error.message,
        code: error.code || 'EXECUTION_ERROR',
        stage: 'code_execution'
      }
    });
  }
}

module.exports = promptController;