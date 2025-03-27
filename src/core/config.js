const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Database configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/neuroledger',
  },

  // Firebase configuration
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  },
  
  // Google Cloud Storage configuration
  storage: {
    projectId: process.env.GCS_PROJECT_ID,
    bucketName: process.env.GCS_BUCKET_NAME,
    keyFilename: process.env.GCS_KEYFILE,
  },

  // Claude API configuration
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    apiUrl: process.env.CLAUDE_API_URL || 'https://api.anthropic.com/v1',
  },

  // Security configuration
  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '24h',
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  },

  // Email configuration
  email: {
    service: process.env.EMAIL_SERVICE,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@neuroledger.com',
  },

  // Execution environment configuration
  execution: {
    timeout: parseInt(process.env.EXECUTION_TIMEOUT) || 30000,
    memoryLimit: process.env.EXECUTION_MEMORY_LIMIT || '512m',
    cpuLimit: parseFloat(process.env.EXECUTION_CPU_LIMIT) || 0.5,
  },
};

// Validate critical configuration
const validateConfig = () => {
  const requiredVars = [
    'database.uri',
    'security.jwtSecret',
  ];

  // Add Firebase validation if not in development mode
  if (config.server.env !== 'development') {
    requiredVars.push('firebase.projectId', 'firebase.privateKey', 'firebase.clientEmail');
  }

  const missing = [];

  requiredVars.forEach(varPath => {
    const parts = varPath.split('.');
    let current = config;
    for (const part of parts) {
      current = current[part];
      if (current === undefined) {
        missing.push(varPath);
        break;
      }
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

// Only validate in production to make development easier
if (config.server.env === 'production') {
  validateConfig();
}

module.exports = config;