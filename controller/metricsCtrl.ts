import { Request, Response } from 'express';
import { ScormMetrics } from '../middlewares/scormMonitoring';

export const getMetricsSummary = async (_req: Request, res: Response): Promise<void> => {
  const scorm = ScormMetrics.getMetrics();

  res.status(200).json({
    success: true,
    data: {
      storage: {
        usedBytes: scorm.storageUsageBytes,
        usedMB: scorm.storageUsageMB,
      },
      sessions: {
        active: scorm.activeSessions,
      },
      errors: {
        recent: scorm.recentErrors,
      },
      scorm,
      timestamp: new Date().toISOString(),
    },
  });
};

export default getMetricsSummary;