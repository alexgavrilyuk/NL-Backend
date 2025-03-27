# Authentication Feature

This feature handles user authentication and authorization for NeuroLedger.

## Components

- **authController.js** - Handles authentication logic (register, login, logout, etc.)
- **authMiddleware.js** - Authentication verification middleware
- **authRoutes.js** - API routes for authentication
- **firebaseConfig.js** - Firebase configuration for authentication

## API Endpoints

- `POST /api/v1/auth/register` - Create new user account
- `POST /api/v1/auth/login` - Authenticate user
- `POST /api/v1/auth/logout` - End user session
- `POST /api/v1/auth/forgot-password` - Initiate password reset
- `GET /api/v1/auth/me` - Get current user information

## Authentication Flow

1. **Registration:**
   - Client submits registration data to `/api/v1/auth/register`
   - Server creates Firebase user
   - Server creates database user record
   - Server returns success with user data

2. **Login:**
   - Client handles Firebase Authentication
   - Client sends Firebase token to `/api/v1/auth/login`
   - Server verifies token and retrieves user data
   - Server returns user data and updates last login time

3. **Authentication for API Requests:**
   - Client includes Firebase token in Authorization header
   - `authMiddleware.js` validates token
   - Middleware attaches user data to request object
   - Protected routes check for user object