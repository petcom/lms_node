/**
 * SCORM Player Routes
 * 
 * Routes for SCORM content delivery and player interface
 */

import express from 'express';
import { launchPlayer, serveContent, exitPlayer } from '../../controller/scorm/scormPlayerCtrl';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { isStudent } from '../../middlewares/roleRestriction';

const router = express.Router();

/**
 * Launch SCORM player
 * GET /api/v1/scorm/player/:packageId/launch
 * 
 * Returns HTML player interface with embedded content
 * Requires authentication (students must be assigned)
 */
router.get('/:packageId/launch', isAuthenticated, launchPlayer);

/**
 * Serve SCORM content files
 * GET /api/v1/scorm/player/:packageId/content/*
 * 
 * Serves static files from extracted SCORM package
 * Handles all content types (HTML, CSS, JS, images, videos, etc.)
 * Requires authentication with access verification
 */
router.get('/:packageId/content/*', isAuthenticated, serveContent);

/**
 * Exit player
 * POST /api/v1/scorm/player/:attemptId/exit
 * 
 * Returns final attempt statistics
 * Requires student authentication
 */
router.post('/:attemptId/exit', isAuthenticated, isStudent, exitPlayer);

export default router;
