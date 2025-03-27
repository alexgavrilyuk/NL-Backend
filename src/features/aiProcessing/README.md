# AI Processing Feature

This feature handles the processing of natural language prompts using the Claude API, turning them into data analysis, visualizations, and insights.

## Components

- **promptController.js** - Handles prompt requests, processing, and results
- **promptRoutes.js** - API routes for prompt management
- **promptModels.js** - Validation schemas for prompt operations
- **claudeService.js** - Integration with Claude API
- **contextEnricher.js** - Enhances prompts with dataset context and user preferences

## API Endpoints

- `POST /api/v1/prompts` - Submit new prompt
- `GET /api/v1/prompts` - Get prompt history
- `GET /api/v1/prompts/:id` - Get specific prompt details
- `POST /api/v1/prompts/:id/execute` - Execute generated code
- `GET /api/v1/prompts/:id/results` - Get execution results

## Prompt Processing Flow

1. **Prompt Submission:**
   - User submits natural language prompt with dataset references
   - System enhances prompt with dataset schema and context
   - Enhanced prompt is sent to Claude API

2. **Code Generation:**
   - Claude API returns generated code for data analysis
   - System validates code for security
   - Code is prepared for execution

3. **Result Processing:**
   - Generated code is executed in a secure environment
   - Results are processed and formatted for visualization
   - Narrative insights are extracted from Claude's response

4. **Result Retrieval:**
   - Frontend retrieves results for display
   - Results include visualization data and narrative insights