/**
 * Health Check Controller
 * Provides system health and status information
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import logger from '../utils/logger';

interface HealthCheckResponse {
  uptime: number;
  message: string;
  timestamp: number;
  checks: {
    api: string;
    database: string;
  };
  error?: string;
}

interface ReadyCheckResponse {
  status: string;
  database?: string;
  message?: string;
}

/**
 * Health check endpoint
 * Returns API and database status
 */
export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  const healthcheck: HealthCheckResponse = {
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
    const dbStates: Record<number, string> = {
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
      res.status(503).json(healthcheck);
      return;
    }

    // All checks passed
    logger.debug('Health check: All systems operational');
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = 'Error';
    healthcheck.error = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(503).json(healthcheck);
  }
};

/**
 * Ready check endpoint
 * Returns 200 only when system is fully ready to accept requests
 */
export const readyCheck = async (_req: Request, res: Response): Promise<void> => {
  try {
    const dbState = mongoose.connection.readyState;

    if (dbState === 1) {
      const response: ReadyCheckResponse = { status: 'ready' };
      res.status(200).json(response);
    } else {
      const response: ReadyCheckResponse = {
        status: 'not ready',
        database: 'not connected',
      };
      res.status(503).json(response);
    }
  } catch (error) {
    logger.error('Ready check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    const response: ReadyCheckResponse = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(503).json(response);
  }
};
