# Shared Middleware

Common middleware used across different features in NeuroLedger.

## Components

- **rateLimiter.js** - API rate limiting to prevent abuse
- **requestLogger.js** - Request logging middleware
- **errorHandler.js** - Feature-specific error handling
- **validator.js** - Input validation using Joi

## Usage

### Rate Limiter

```javascript
const rateLimiter = require('../shared/middleware/rateLimiter');

// Use predefined auth rate limiter
router.post('/login', rateLimiter.auth, loginController);

// Use predefined API rate limiter
router.get('/data', rateLimiter.api, getDataController);

// Create custom rate limiter
const customLimiter = rateLimiter.create({
  windowMs: 60 * 1000, // 1 minute
  max: 5 // 5 requests per minute
});
router.post('/sensitive-endpoint', customLimiter, sensitiveController);
```

### Request Validator

```javascript
const { validate, schemas } = require('../shared/middleware/validator');

// Use predefined validation schema
router.post('/register', validate(schemas.userRegistration), registerController);

// Create custom validation schema
const customSchema = Joi.object({
  name: Joi.string().required(),
  age: Joi.number().integer().min(18).required()
});
router.post('/custom-endpoint', validate(customSchema), customController);
```

### Request Logger

```javascript
const requestLogger = require('../shared/middleware/requestLogger');

// Apply to all routes in a router
router.use(requestLogger);

// Or apply to specific route
router.get('/path', requestLogger, controller);
```

### Error Handler

```javascript
const featureErrorHandler = require('../shared/middleware/errorHandler');

// Apply at the end of route definitions
router.use(featureErrorHandler);
```