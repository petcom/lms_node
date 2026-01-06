/**
 * SCORM Report Routes
 *
 * Routes for SCORM tracking and reporting features
 */

import express from 'express';
import {
  getLearnerProgress,
  getPackageAnalytics,
  getAttemptDetails,
  exportTrackingData,
  getCompletionRates,
  getScoreDistribution,
  getTimeAnalytics,
  getInteractionData,
} from '../../controller/scorm/scormReportCtrl';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import { cachePrivate } from '../../middlewares/caching';
import departmentScope from '../../middlewares/departmentScope';

const router = express.Router();

/**
 * Learner Progress
 * GET /api/v1/content/scorm/reports/learner/:learnerId
 *
 * Get progress across all SCORM packages for a learner
 * Learners can view their own, Staff/Admins can view any
 * Cached for 2 minutes (learner data changes frequently)
 */
router.get(
  '/learner/:learnerId',
  isAuthenticated,
  departmentScope(),
  cachePrivate(120),
  getLearnerProgress
);

/**
 * Package Analytics
 * GET /api/v1/content/scorm/reports/package/:packageId/analytics
 *
 * Get analytics for a specific package (staff/admin only)
 * Includes completion rates, score distribution, time analysis
 * Cached for 5 minutes (analytics data doesn't change rapidly)
 */
router.get(
  '/package/:packageId/analytics',
  isAuthenticated,
  departmentScope(),
  isInstructorOrAdmin,
  cachePrivate(300),
  getPackageAnalytics
);

/**
 * Attempt Details
 * GET /api/v1/content/scorm/reports/attempts/:attemptId
 *
 * Get detailed information about a specific attempt
 * Includes full CMI data and session log
 * Cached for 1 minute (can change during active session)
 */
router.get(
  '/attempts/:attemptId',
  isAuthenticated,
  departmentScope(),
  cachePrivate(60),
  getAttemptDetails
);

/**
 * Export Tracking Data
 * GET /api/v1/content/scorm/reports/export
 *
 * Export tracking data in various formats (JSON, CSV, XLSX)
 * Staff/Admin only
 * No caching (generates fresh export each time)
 */
router.get('/export', isAuthenticated, departmentScope(), isInstructorOrAdmin, exportTrackingData);

/**
 * Completion Rates
 * GET /api/v1/content/scorm/reports/completion/:packageId
 *
 * Get completion rates over time for a package
 * Staff/Admin only
 * Cached for 5 minutes
 */
router.get(
  '/completion/:packageId',
  isAuthenticated,
  departmentScope(),
  isInstructorOrAdmin,
  cachePrivate(300),
  getCompletionRates
);

/**
 * Score Distribution
 * GET /api/v1/content/scorm/reports/scores/:packageId
 *
 * Get score distribution and statistics for a package
 * Staff/Admin only
 * Cached for 5 minutes
 */
router.get(
  '/scores/:packageId',
  isAuthenticated,
  departmentScope(),
  isInstructorOrAdmin,
  cachePrivate(300),
  getScoreDistribution
);

/**
 * Time Analytics
 * GET /api/v1/content/scorm/reports/time/:packageId
 *
 * Get time spent analytics for a package
 * Instructor/Admin only
 * Cached for 5 minutes
 */
router.get(
  '/time/:packageId',
  isAuthenticated,
  departmentScope(),
  isInstructorOrAdmin,
  cachePrivate(300),
  getTimeAnalytics
);

/**
 * Interaction Data
 * GET /api/v1/content/scorm/reports/interactions/:attemptId
 *
 * Get interaction tracking data for an attempt
 * Includes question responses, correct/incorrect answers
 * Cached for 2 minutes
 */
router.get(
  '/interactions/:attemptId',
  isAuthenticated,
  departmentScope(),
  cachePrivate(120),
  getInteractionData
);

export default router;
