/**
 * SCORM Health and Metrics Controller
 * Provides monitoring and health check endpoints
 */

import { Request, Response } from 'express';
import { getScormHealthStatus, ScormMetrics } from '../../middlewares/scormMonitoring';
import logger from '../../utils/logger';

/**
 * @swagger
 * /api/v1/content/scorm/health:
 *   get:
 *     summary: Get SCORM system health status
 *     description: Returns health status and metrics for SCORM system monitoring
 *     tags: [SCORM - Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SCORM system health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                   example: healthy
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     activeSessions:
 *                       type: number
 *                       example: 42
 *                     packageUploads:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         success:
 *                           type: number
 *                         failed:
 *                           type: number
 *                     attemptStarts:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         success:
 *                           type: number
 *                         failed:
 *                           type: number
 *                     attemptCompletions:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         passed:
 *                           type: number
 *                         failed:
 *                           type: number
 *                     apiCalls:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         initialize:
 *                           type: number
 *                         getValue:
 *                           type: number
 *                         setValue:
 *                           type: number
 *                         commit:
 *                           type: number
 *                         terminate:
 *                           type: number
 *                     averageResponseTime:
 *                       type: number
 *                       description: Average response time in milliseconds
 *                       example: 234
 *                     storageUsageBytes:
 *                       type: number
 *                     storageUsageMB:
 *                       type: number
 *                     recentErrors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           error:
 *                             type: string
 *                           endpoint:
 *                             type: string
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["High average response time"]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
export const getHealthStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthStatus = getScormHealthStatus();

    logger.info('SCORM health check accessed', {
      event: 'scorm.health.check',
      status: healthStatus.status,
      accessedBy: (req as any).user?.id,
    });

    res.status(200).json({
      success: true,
      ...healthStatus,
    });
  } catch (error: any) {
    logger.error('Error getting SCORM health status', {
      event: 'scorm.health.error',
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health status',
    });
  }
};

/**
 * @swagger
 * /api/v1/content/scorm/metrics:
 *   get:
 *     summary: Get detailed SCORM metrics
 *     description: Returns detailed metrics for SCORM system monitoring and analytics
 *     tags: [SCORM - Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed SCORM metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 metrics:
 *                   type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
export const getMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const metrics = ScormMetrics.getMetrics();

    logger.info('SCORM metrics accessed', {
      event: 'scorm.metrics.access',
      accessedBy: (req as any).user?.id,
    });

    res.status(200).json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error getting SCORM metrics', {
      event: 'scorm.metrics.error',
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
    });
  }
};

/**
 * @swagger
 * /api/v1/content/scorm/metrics/reset:
 *   post:
 *     summary: Reset SCORM metrics (admin only)
 *     description: Resets all in-memory SCORM metrics. For development and testing purposes.
 *     tags: [SCORM - Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Metrics reset successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
export const resetMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    ScormMetrics.reset();

    logger.warn('SCORM metrics reset', {
      event: 'scorm.metrics.reset',
      resetBy: (req as any).user?.id,
    });

    res.status(200).json({
      success: true,
      message: 'Metrics reset successfully',
    });
  } catch (error: any) {
    logger.error('Error resetting SCORM metrics', {
      event: 'scorm.metrics.reset_error',
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics',
    });
  }
};

export default {
  getHealthStatus,
  getMetrics,
  resetMetrics,
};
