# Subscription Management Feature

This feature handles subscription plans, trials, and subscription status management for NeuroLedger.

## Components

- **subscriptionController.js** - Handles subscription logic (plan management, trial activation, etc.)
- **subscriptionMiddleware.js** - Feature access and limits checking based on subscription
- **subscriptionRoutes.js** - API routes for subscription management
- **subscriptionModels.js** - Data validation schemas for subscription operations

## API Endpoints

- `GET /api/v1/subscription/plans` - List available subscription plans
- `GET /api/v1/subscription/status` - Get current subscription status
- `POST /api/v1/subscription/activate-trial` - Activate free trial
- `PUT /api/v1/subscription/change` - Change subscription plan
- `POST /api/v1/subscription/cancel` - Cancel subscription

## Subscription Plans

- **Basic Plan**
  - Up to 5 datasets
  - Basic visualizations
  - CSV/Excel imports
  - Email support

- **Professional Plan**
  - Up to 20 datasets
  - Advanced visualizations
  - Team collaboration (up to 3 members)
  - Priority email support
  - Export to PDF/Excel

- **Enterprise Plan**
  - Unlimited datasets
  - Custom visualizations
  - Team collaboration (unlimited members)
  - Dedicated support
  - Advanced exports
  - Custom integrations

## Middleware Usage

The subscription middleware can be used to enforce feature access and limits:

```javascript
const subscriptionMiddleware = require('../subscription/subscriptionMiddleware');

// Check if user has access to a specific feature
router.post('/export-pdf',
  authMiddleware.verifyToken,
  subscriptionMiddleware.checkFeatureAccess('pdf_export'),
  exportController.exportPdf
);

// Check if user is within dataset limits before creating new dataset
router.post('/datasets',
  authMiddleware.verifyToken,
  subscriptionMiddleware.checkDatasetLimit(),
  datasetController.createDataset
);

// Check if user is within team member limits before adding new member
router.post('/teams/:id/members',
  authMiddleware.verifyToken,
  subscriptionMiddleware.checkTeamMemberLimit(),
  teamController.addMember
);
```