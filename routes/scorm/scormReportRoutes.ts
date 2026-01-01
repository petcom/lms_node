/**
 * SCORM Report Routes
 *
 * Routes for SCORM tracking and reporting features
 */

import express from 'express';
import {
  getStudentProgress,
  getPackageAnalytics,
  getAttemptDetails,
  exportTrackingData,
  getCompletionRates,
  getScoreDistribution,
  getTimeAnalytics,
  getInteractionData,
} from '../../controller/scorm/scormReportCtrl';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isTeacherOrAdmin } from '../../middlewares/roleRestriction';
import { cachePrivate } from '../../middlewares/caching';
import departmentScope from '../../middlewares/departmentScope';

const isTeacher = roleRestriction('staff');

const router = express.Router();

/**
 * Student Progress
 * GET /api/v1/scorm/reports/student/:studentId
 *
 * Get progress across all SCORM packages for a student
 * Students can view their own, Staff/Admins can view any
 * Cached for 2 minutes (student data changes frequently)
 */
router.get(
  '/student/:studentId',
  isAuthenticated,
  departmentScope(),
  cachePrivate(120),
  getStudentProgress
);

/**
 * Package Analytics
 * GET /api/v1/scorm/reports/package/:packageId/analytics
 *
 * Get analytics for a specific package (staff/admin only)
 * Includes completion rates, score distribution, time analysis
 * Cached for 5 minutes (analytics data doesn't change rapidly)
 */
router.get(
  '/package/:packageId/analytics',
  isAuthenticated,
  departmentScope(),
  isTeacherOrAdmin,
  cachePrivate(300),
  getPackageAnalytics
);

/**
 * Attempt Details
 * GET /api/v1/scorm/reports/attempts/:attemptId
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
 * GET /api/v1/scorm/reports/export
 *
 * Export tracking data in various formats (JSON, CSV, XLSX)
 * Staff/Admin only
 * No caching (generates fresh export each time)
 */
router.get('/export', isAuthenticated, departmentScope(), isTeacherOrAdmin, exportTrackingData);

/**
 * Completion Rates
 * GET /api/v1/scorm/reports/completion/:packageId
 *
 * Get completion rates over time for a package
 * Staff/Admin only
 * Cached for 5 minutes
 */
router.get(
  '/completion/:packageId',
  isAuthenticated,
  departmentScope(),
  isTeacherOrAdmin,
  cachePrivate(300),
  getCompletionRates
);

/**
 * Score Distribution
 * GET /api/v1/scorm/reports/scores/:packageId
 *
 * Get score distribution and statistics for a package
 * Staff/Admin only
 * Cached for 5 minutes
 */
router.get(
  '/scores/:packageId',
  isAuthenticated,
  departmentScope(),
  isTeacherOrAdmin,
  cachePrivate(300),
  getScoreDistribution
);

/**
 * Time Analytics
 * GET /api/v1/scorm/reports/time/:packageId
 *
 * Get time spent analytics for a package
 * Teacher/Admin only
 * Cached for 5 minutes
 */
router.get(
  '/time/:packageId',
  isAuthenticated,
  departmentScope(),
  isTeacherOrAdmin,
  cachePrivate(300),
  getTimeAnalytics
);

/**
 * Interaction Data
 * GET /api/v1/scorm/reports/interactions/:attemptId
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
