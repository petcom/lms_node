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
import roleRestriction from '../../middlewares/roleRestriction';

const isTeacher = roleRestriction('teacher');

const router = express.Router();

/**
 * Student Progress
 * GET /api/v1/scorm/reports/student/:studentId
 * 
 * Get progress across all SCORM packages for a student
 * Students can view their own, Teachers/Admins can view any
 */
router.get('/student/:studentId', isAuthenticated, getStudentProgress);

/**
 * Package Analytics
 * GET /api/v1/scorm/reports/package/:packageId/analytics
 * 
 * Get analytics for a specific package (teacher/admin only)
 * Includes completion rates, score distribution, time analysis
 */
router.get('/package/:packageId/analytics', isAuthenticated, isTeacher, getPackageAnalytics);

/**
 * Attempt Details
 * GET /api/v1/scorm/reports/attempts/:attemptId
 * 
 * Get detailed information about a specific attempt
 * Includes full CMI data and session log
 */
router.get('/attempts/:attemptId', isAuthenticated, getAttemptDetails);

/**
 * Export Tracking Data
 * GET /api/v1/scorm/reports/export
 * 
 * Export tracking data in various formats (JSON, CSV, XLSX)
 * Teacher/Admin only
 */
router.get('/export', isAuthenticated, isTeacher, exportTrackingData);

/**
 * Completion Rates
 * GET /api/v1/scorm/reports/completion/:packageId
 * 
 * Get completion rates over time for a package
 * Teacher/Admin only
 */
router.get('/completion/:packageId', isAuthenticated, isTeacher, getCompletionRates);

/**
 * Score Distribution
 * GET /api/v1/scorm/reports/scores/:packageId
 * 
 * Get score distribution and statistics for a package
 * Teacher/Admin only
 */
router.get('/scores/:packageId', isAuthenticated, isTeacher, getScoreDistribution);

/**
 * Time Analytics
 * GET /api/v1/scorm/reports/time/:packageId
 * 
 * Get time spent analytics for a package
 * Teacher/Admin only
 */
router.get('/time/:packageId', isAuthenticated, isTeacher, getTimeAnalytics);

/**
 * Interaction Data
 * GET /api/v1/scorm/reports/interactions/:attemptId
 * 
 * Get interaction tracking data for an attempt
 * Includes question responses, correct/incorrect answers
 */
router.get('/interactions/:attemptId', isAuthenticated, getInteractionData);

export default router;
