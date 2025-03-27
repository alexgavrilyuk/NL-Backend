const winston = require('winston');
const config = require('./config');

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += JSON.stringify(metadata);
  }

  return msg;
});

// Create the logger
const logger = winston.createLogger({
  level: config.server.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      dirname: 'logs'
    }),
    new winston.transports.File({
      filename: 'combined.log',
      dirname: 'logs'
    })
  ]
});

// Create a stream object for Morgan middleware
logger.stream = {
  write: (message) => logger.info(message.trim())
};

module.exports = logger;