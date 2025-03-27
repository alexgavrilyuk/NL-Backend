// /src/features/aiProcessing/claudeService.js

const axios = require('axios');
const config = require('../../core/config');
const logger = require('../../core/logger');
const { AppError } = require('../../core/errorHandler');

/**
 * Service for interacting with the Claude API
 */
const claudeService = {
  /**
   * Initialize the Claude API client
   * @returns {Object} Axios instance for Claude API
   */
  getClient: () => {
    return axios.create({
      baseURL: config.claude.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.claude.apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 60000 // 60 second timeout
    });
  },

  /**
   * Generate code from a prompt using Claude API
   * @param {string} enhancedPrompt - The enhanced prompt to send to Claude
   * @returns {Promise<Object>} Claude API response
   */
  generateCode: async (enhancedPrompt) => {
    try {
      const client = claudeService.getClient();

      // Create the system prompt that instructs Claude how to respond
      const systemPrompt = `You are a financial data analysis assistant that helps generate JavaScript code for analyzing and visualizing data.

Your task is to generate working JavaScript code that can run in a Node.js environment based on the user's natural language request.

The code should:
1. Process the data described in the prompt
2. Generate appropriate visualizations (chart configurations)
3. Extract meaningful insights from the data
4. Return results in a structured JSON format with visualization data and insights

Rules:
- Only use pure JavaScript and standard Node.js libraries
- Do not use external imports other than those explicitly mentioned in the prompt
- Structure your response as a single JavaScript function with no dependencies
- Return data in this format: { visualizations: [], insights: [] }
- Each visualization should include: { type, title, data, config }
- Each insight should include: { title, content, importance (1-5) }

Important: Respond ONLY with the code, no explanations or other text.`;

      // Prepare request payload
      const payload = {
        model: "claude-3-opus-20240229",  // Use the appropriate Claude model
        max_tokens: 4096,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: 0.2  // Low temperature for more deterministic code generation
      };

      // Send request to Claude API
      const response = await client.post('', payload);

      // Extract the generated code from Claude's response
      const generatedCode = response.data.content[0].text;

      if (!generatedCode || generatedCode.trim() === '') {
        throw new AppError('Claude API returned empty response', 500, 'CLAUDE_EMPTY_RESPONSE');
      }

      return {
        generatedCode,
        rawResponse: response.data
      };
    } catch (error) {
      logger.error(`Claude API error: ${error.message}`);

      if (error.response) {
        logger.error(`Claude API error details: ${JSON.stringify(error.response.data)}`);
        throw new AppError(
          'Error from Claude API: ' + (error.response.data.error?.message || 'Unknown error'),
          500,
          'CLAUDE_API_ERROR'
        );
      }

      throw new AppError('Failed to generate code from Claude API', 500, 'CLAUDE_SERVICE_ERROR');
    }
  },

  /**
   * Generate narrative insights from analysis results
   * @param {Object} results - The results from code execution
   * @param {string} originalPrompt - The original user prompt
   * @returns {Promise<Array>} Array of narrative insights
   */
  generateInsights: async (results, originalPrompt) => {
    try {
      const client = claudeService.getClient();

      // Create the system prompt for generating insights
      const systemPrompt = `You are a financial analyst assistant. Based on the data analysis results and the original question,
      provide 3-5 key insights about the data. Each insight should be valuable and directly related to the user's question.

Format your response as a JSON array of insight objects with:
- title: Short title for the insight (max 50 chars)
- content: Detailed explanation (max 200 words)
- importance: Number from 1 (interesting) to 5 (critical)

Respond ONLY with the JSON array, no other text or explanation.`;

      // Prepare request payload
      const payload = {
        model: "claude-3-opus-20240229",  // Use the appropriate Claude model
        max_tokens: 2048,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Original question: "${originalPrompt}"\n\nAnalysis results: ${JSON.stringify(results)}`
          }
        ],
        temperature: 0.7  // Higher temperature for more creative insights
      };

      // Send request to Claude API
      const response = await client.post('', payload);

      // Extract and parse the insights
      const insightsText = response.data.content[0].text;

      try {
        const insights = JSON.parse(insightsText);
        return Array.isArray(insights) ? insights : [];
      } catch (parseError) {
        logger.error(`Error parsing insights from Claude: ${parseError.message}`);
        return [];
      }
    } catch (error) {
      logger.error(`Claude API insights error: ${error.message}`);
      // Return empty array instead of throwing, to avoid breaking the whole response
      return [];
    }
  }
};

module.exports = claudeService;