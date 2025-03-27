# Reporting Feature

This feature handles report generation, storage, and export functionality for NeuroLedger.

## Components

- **reportController.js** - Handles report creation, retrieval, and management
- **reportRoutes.js** - API routes for report operations
- **reportModels.js** - Data validation schemas for report operations
- **exportService.js** - Handles PDF and image export functionality

## API Endpoints

- `POST /api/v1/reports` - Create new report
- `GET /api/v1/reports` - List all user reports
- `GET /api/v1/reports/:id` - Get specific report
- `PUT /api/v1/reports/:id` - Update report
- `DELETE /api/v1/reports/:id` - Delete report
- `POST /api/v1/reports/:id/export` - Export report (PDF/image)
- `POST /api/v1/reports/:id/share` - Share report with team
- `GET /api/v1/reports/:id/drill-down` - Get detail data for report section