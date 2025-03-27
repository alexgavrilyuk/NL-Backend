# Account Management Feature

This feature handles user profiles, preferences, and settings management for NeuroLedger.

## Components

- **accountController.js** - Handles user profile and settings operations
- **accountRoutes.js** - API routes for account management
- **accountModels.js** - Data validation schemas for account operations

## API Endpoints

- `GET /api/v1/account/profile` - Get user profile
- `PUT /api/v1/account/profile` - Update user profile
- `GET /api/v1/account/settings` - Get user settings
- `PUT /api/v1/account/settings` - Update user settings
- `GET /api/v1/account/preferences` - Get user preferences
- `PUT /api/v1/account/preferences` - Update user preferences
- `GET /api/v1/account/onboarding` - Get onboarding status
- `PUT /api/v1/account/onboarding` - Update onboarding status