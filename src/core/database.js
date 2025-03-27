const admin = require('firebase-admin');
const config = require('./config');
const logger = require('./logger');

// Initialize Firestore
const initializeFirestore = async () => {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      logger.info('Firebase already initialized');
      return admin.firestore();
    }

    // Initialize the app
    const serviceAccount = {
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      privateKey: config.firebase.privateKey
    };

    // If running locally without credentials, use local emulator
    let firebaseConfig;
    if (config.server.env === 'development' &&
        (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey)) {
      logger.warn('Firebase credentials not found, using local emulator if available');
      firebaseConfig = {
        projectId: 'neuroledger-dev',
        databaseURL: config.firebase.databaseURL || 'localhost:8080'
      };
    } else {
      firebaseConfig = {
        credential: admin.credential.cert(serviceAccount),
        databaseURL: config.firebase.databaseURL
      };
    }

    admin.initializeApp(firebaseConfig);

    const db = admin.firestore();

    // Set Firestore settings
    db.settings({
      ignoreUndefinedProperties: true,
    });

    logger.info('Firestore initialized successfully');

    return db;
  } catch (error) {
    logger.error(`Error initializing Firestore: ${error.message}`);
    if (config.server.env === 'production') {
      process.exit(1);
    }
    // Return null in development mode to allow app to run without DB
    return null;
  }
};

module.exports = {
  initializeFirestore,
  getFirestore: () => admin.firestore(),
  admin
};