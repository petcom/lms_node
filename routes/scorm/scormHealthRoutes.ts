/**
 * SCORM Health and Monitoring Routes
 */

import express from 'express';
import { getHealthStatus, getMetrics, resetMetrics } from '../../controller/scorm/scormHealthCtrl';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';

const router = express.Router();

// Public health check (no auth required for load balancers)
router.get('/health', getHealthStatus);

// Protected metrics endpoints
router.get('/metrics', isAuthenticated(), roleRestriction('admin', 'staff'), getMetrics);
router.post('/metrics/reset', isAuthenticated(), roleRestriction('admin'), resetMetrics);

export default router;
