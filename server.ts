import 'dotenv-safe/config';
import http from 'http';
import dbConnect from './config/dbConnect';
import logger from './utils/logger';
import app from './app/app';

const PORT = process.env.PORT || 8082;

// Connect to database
dbConnect();

// server
const server = http.createServer(app);
server.listen(PORT, () => {
  logger.info(`Server is running on port: ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
