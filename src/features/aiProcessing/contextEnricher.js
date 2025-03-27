// /src/features/aiProcessing/contextEnricher.js

const logger = require('../../core/logger');
const { getDocument, queryDocuments } = require('../shared/database/dbUtils');
const { AppError } = require('../../core/errorHandler');
const { Storage } = require('@google-cloud/storage');
const config = require('../../core/config');
const csv = require('csv-parser');
const xlsx = require('node-xlsx');
const { Readable } = require('stream');

/**
 * Service for enriching prompts with context for better AI processing
 */
const contextEnricher = {
  /**
   * Enhance a prompt with dataset schema, user preferences, and team context
   * @param {string} prompt - The original user prompt
   * @param {Array} datasetIds - Array of dataset IDs to include in context
   * @param {Object} user - User object from the request
   * @returns {Promise<string>} Enhanced prompt
   */
  enhancePrompt: async (prompt, datasetIds, user) => {
    try {
      // Start building enhanced prompt
      let enhancedPrompt = `ORIGINAL REQUEST: ${prompt}\n\n`;

      // Add user preferences context
      enhancedPrompt += await contextEnricher.addUserContext(user);

      // Add team context if available
      if (user.teamId) {
        enhancedPrompt += await contextEnricher.addTeamContext(user.teamId);
      }

      // Add dataset context
      if (datasetIds && datasetIds.length > 0) {
        enhancedPrompt += await contextEnricher.addDatasetContext(datasetIds, user.uid);
      }

      // Add code generation instructions
      enhancedPrompt += contextEnricher.addCodeInstructions();

      logger.info(`Enhanced prompt created with ${datasetIds?.length || 0} datasets`);

      return enhancedPrompt;
    } catch (error) {
      logger.error(`Error enhancing prompt: ${error.message}`);
      throw new AppError('Error preparing analysis context', 500, 'CONTEXT_ENHANCEMENT_ERROR');
    }
  },

  /**
   * Add user preferences and settings to context
   * @param {Object} user - User object from the request
   * @returns {Promise<string>} User context string
   */
  addUserContext: async (user) => {
    // Use both preferences and settings for more complete context
    const { preferences = {}, settings = {} } = user;

    let context = "USER PREFERENCES:\n";

    // Add settings information
    if (settings?.currency) {
      context += `- Currency: ${settings.currency}\n`;
    }

    if (settings?.dateFormat) {
      context += `- Date Format: ${settings.dateFormat}\n`;
    }

    if (settings?.language) {
      context += `- Language: ${settings.language}\n`;
    }

    // Add business context information
    if (preferences?.industry) {
      context += `- Industry: ${preferences.industry}\n`;
    }

    if (preferences?.businessType) {
      context += `- Business Type: ${preferences.businessType}\n`;
    }

    // Add AI context preferences
    if (preferences?.aiContext) {
      if (preferences.aiContext.financialYear) {
        context += `- Financial Year: ${preferences.aiContext.financialYear}\n`;
      }

      if (preferences.aiContext.reportingPeriod) {
        context += `- Reporting Period: ${preferences.aiContext.reportingPeriod}\n`;
      }

      if (preferences.aiContext.companySize) {
        context += `- Company Size: ${preferences.aiContext.companySize}\n`;
      }

      if (preferences.aiContext.analysisPreference) {
        context += `- Analysis Preference: ${preferences.aiContext.analysisPreference}\n`;
      }
    }

    return context + "\n";
  },

  /**
   * Add team context to the prompt
   * @param {string} teamId - Team ID
   * @returns {Promise<string>} Team context string
   */
  addTeamContext: async (teamId) => {
    try {
      const team = await getDocument('teams', teamId);

      if (!team) {
        return "";
      }

      let context = "TEAM CONTEXT:\n";

      if (team.context) {
        if (team.context.business) {
          context += `- Business: ${team.context.business}\n`;
        }

        if (team.context.industry) {
          context += `- Industry: ${team.context.industry}\n`;
        }

        if (team.context.preferences) {
          const { preferences } = team.context;
          Object.keys(preferences).forEach(key => {
            context += `- ${key}: ${preferences[key]}\n`;
          });
        }
      }

      return context + "\n";
    } catch (error) {
      logger.error(`Error getting team context: ${error.message}`);
      return "";
    }
  },

  /**
   * Add dataset information and schema to the prompt
   * @param {Array} datasetIds - Array of dataset IDs
   * @param {string} userId - User ID for access check
   * @returns {Promise<string>} Dataset context string
   */
  addDatasetContext: async (datasetIds, userId) => {
    try {
      let context = "DATASETS:\n";

      // Fetch all datasets in a single query
      const datasets = await Promise.all(
        datasetIds.map(id => getDocument('datasets', id))
      );

      // Filter out null results and check permissions
      const validDatasets = datasets.filter(ds =>
        ds !== null && (ds.ownerId === userId || ds.teamId)
      );

      if (validDatasets.length === 0) {
        return "No valid datasets available.\n\n";
      }

      // Add context for each dataset
      for (const dataset of validDatasets) {
        context += `\nDATASET: ${dataset.name}\n`;

        if (dataset.description) {
          context += `Description: ${dataset.description}\n`;
        }

        if (dataset.metadata) {
          context += "Metadata:\n";
          Object.keys(dataset.metadata).forEach(key => {
            context += `- ${key}: ${dataset.metadata[key]}\n`;
          });
        }

        // Add schema information
        if (dataset.schema && dataset.schema.columns) {
          context += "\nSchema:\n";
          dataset.schema.columns.forEach(column => {
            context += `- Column: ${column.name}, Type: ${column.type}`;
            if (column.description) {
              context += `, Description: ${column.description}`;
            }
            context += `\n`;

            // Add examples if available
            if (column.examples && column.examples.length > 0) {
              context += `  Examples: ${column.examples.slice(0, 3).join(', ')}\n`;
            }
          });
        }

        // Get sample data if needed
        if (!dataset.schema || !dataset.schema.sampleData) {
          const sampleData = await contextEnricher.getSampleData(dataset);
          context += "\nSample Data:\n";
          context += JSON.stringify(sampleData, null, 2) + "\n";
        } else if (dataset.schema.sampleData) {
          context += "\nSample Data:\n";
          context += JSON.stringify(dataset.schema.sampleData, null, 2) + "\n";
        }
      }

      return context + "\n";
    } catch (error) {
      logger.error(`Error adding dataset context: ${error.message}`);
      return "Error retrieving dataset information.\n\n";
    }
  },

  /**
   * Get sample data from a dataset file
   * @param {Object} dataset - Dataset object
   * @returns {Promise<Array>} Sample data from the dataset
   */
  getSampleData: async (dataset) => {
    try {
      // Initialize Google Cloud Storage
      const storage = new Storage({
        projectId: config.storage.projectId,
        keyFilename: config.storage.keyFilename
      });

      const bucket = storage.bucket(config.storage.bucketName);
      const file = bucket.file(dataset.fileInfo.storageUrl);

      // Get file content
      const [content] = await file.download();

      // Parse based on file type
      let sampleData = [];

      if (dataset.fileInfo.type === 'text/csv') {
        // Parse CSV
        const results = [];
        await new Promise((resolve, reject) => {
          const stream = Readable.from(content);
          stream
            .pipe(csv())
            .on('data', (data) => {
              if (results.length < 5) {
                results.push(data);
              }
            })
            .on('end', () => {
              resolve();
            })
            .on('error', (error) => {
              reject(error);
            });
        });

        sampleData = results;
      } else if (dataset.fileInfo.type.includes('spreadsheetml') ||
                dataset.fileInfo.type.includes('excel')) {
        // Parse Excel
        const sheets = xlsx.parse(content);
        if (sheets.length > 0 && sheets[0].data.length > 0) {
          const headers = sheets[0].data[0];
          const rows = sheets[0].data.slice(1, 6); // Get up to 5 rows

          sampleData = rows.map(row => {
            const rowObj = {};
            headers.forEach((header, i) => {
              rowObj[header] = row[i];
            });
            return rowObj;
          });
        }
      }

      return sampleData;
    } catch (error) {
      logger.error(`Error getting sample data: ${error.message}`);
      return [];
    }
  },

  /**
   * Add code generation instructions to the prompt
   * @returns {string} Code instructions string
   */
  addCodeInstructions: () => {
    return `
CODE GENERATION INSTRUCTIONS:

Generate JavaScript code that:
1. Analyzes the data described in the datasets
2. Creates appropriate visualizations based on the request
3. Extracts meaningful insights
4. Formats results in a structured format

CODE CONSTRAINTS:
- Use only pure JavaScript and standard Node.js libraries
- Do not use any external imports
- Assume the dataset is available as a parsed JavaScript object
- Return results in this format: { visualizations: [], insights: [] }
- Each visualization should include: { type, title, data, config }
- Each insight should include: { title, content, importance }

BEST PRACTICES:
- Use appropriate data processing techniques
- Clean and validate data before analysis
- Use descriptive variable names
- Handle potential errors gracefully
- Add brief comments to explain complex operations

RESPOND ONLY WITH THE GENERATED CODE, NO EXPLANATIONS OR OTHER TEXT.
`;
  }
};

module.exports = contextEnricher;