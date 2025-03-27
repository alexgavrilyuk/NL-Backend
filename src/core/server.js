const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Import core modules
const config = require('./config');
const logger = require('./logger');
const { initializeFirestore } = require('./database');
const { registerRoutes } = require('./routes');
const { errorHandler, handleUnhandledRejection, handleUncaughtException } = require('./errorHandler');

// Initialize error handlers for uncaught exceptions and unhandled rejections
handleUncaughtException();

// Create Express app
const app = express();

// Set security headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: config.server.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Compress responses
app.use(compression());

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Initialize Firestore
const initializeServices = async () => {
  try {
    // Initialize Firestore
    if (config.server.env === 'production' || process.env.CONNECT_DB === 'true') {
      await initializeFirestore();
    } else {
      logger.warn('Database connection skipped in development mode. Set CONNECT_DB=true to enable.');
    }

    // Register API routes
    registerRoutes(app);

    // Global error handler
    app.use(errorHandler);

    // Start server
    const server = app.listen(config.server.port, () => {
      logger.info(`Server running in ${config.server.env} mode on port ${config.server.port}`);
    });

    // Handle unhandled rejections
    handleUnhandledRejection(server);

  } catch (error) {
    logger.error(`Error initializing services: ${error.message}`);
    process.exit(1);
  }
};

// Initialize services and start the server
initializeServices();

module.exports = app;