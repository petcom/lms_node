/**
 * Health Check Controller
 * Provides system health and status information
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Health check endpoint
 * Returns API and database status
 */
exports.healthCheck = async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {
      api: 'healthy',
      database: 'unknown',
    },
  };

  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    healthcheck.checks.database = dbStates[dbState] || 'unknown';

    // If database is not connected, return 503
    if (dbState !== 1) {
      healthcheck.message = 'Degraded';
      logger.warn('Health check: Database not connected', { dbState });
      return res.status(503).json(healthcheck);
    }

    // All checks passed
    logger.debug('Health check: All systems operational');
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = 'Error';
    healthcheck.error = error.message;
    logger.error('Health check failed', { error: error.message, stack: error.stack });
    res.status(503).json(healthcheck);
  }
};

/**
 * Ready check endpoint
 * Returns 200 only when system is fully ready to accept requests
 */
exports.readyCheck = async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    
    if (dbState === 1) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready', database: 'not connected' });
    }
  } catch (error) {
    logger.error('Ready check failed', { error: error.message });
    res.status(503).json({ status: 'error', message: error.message });
  }
};
