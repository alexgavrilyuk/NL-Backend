# Dataset Management Feature

This feature handles dataset uploads, storage, and management for NeuroLedger.

## Components

- **datasetController.js** - Handles dataset upload, retrieval, and management
- **datasetRoutes.js** - API routes for dataset operations
- **datasetModels.js** - Data validation schemas for dataset operations
- **storageService.js** - Google Cloud Storage integration for file storage
- **schemaDetector.js** - Automatic schema detection for CSV/Excel files

## API Endpoints

- `POST /api/v1/datasets/upload` - Upload new dataset
- `GET /api/v1/datasets` - List all user datasets
- `GET /api/v1/datasets/:id` - Get specific dataset metadata
- `PUT /api/v1/datasets/:id` - Update dataset metadata
- `DELETE /api/v1/datasets/:id` - Delete/archive dataset
- `GET /api/v1/datasets/:id/schema` - Get dataset schema
- `PUT /api/v1/datasets/:id/schema` - Update schema metadata
- `GET /api/v1/datasets/:id/download` - Download dataset