/**
 * SCORM Health and Monitoring Routes
 */

import express from 'express';
import { getHealthStatus, getMetrics, resetMetrics } from '../../controller/scorm/scormHealthCtrl';
import { protect, authorize } from '../../middlewares/auth';

const router = express.Router();

// Public health check (no auth required for load balancers)
router.get('/health', getHealthStatus);

// Protected metrics endpoints
router.get('/metrics', protect, authorize('admin', 'teacher'), getMetrics);
router.post('/metrics/reset', protect, authorize('admin'), resetMetrics);

export default router;
