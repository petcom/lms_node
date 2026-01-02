/**
 * SCORM Player Routes
 *
 * Routes for SCORM content delivery and player interface
 */

import express, { Request, Response, NextFunction } from 'express';
import { launchPlayer, serveContent, exitPlayer } from '../../controller/scorm/scormPlayerCtrl';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { isLearner } from '../../middlewares/roleRestriction';

const router = express.Router();

// Allow token to be passed via query string for iframe/content requests
const attachTokenFromQuery = (req: Request, res: Response, next: NextFunction) => {
  const token = (req.query.token as string) || '';

  if (token && !req.headers.authorization) {
    const bearerToken = token.startsWith('Bearer') ? token : `Bearer ${token}`;
    req.headers.authorization = bearerToken;

    // Persist token so subsequent asset requests (fonts/images) can authenticate without query params
    const rawToken = bearerToken.split(' ')[1];
    res.cookie('token', rawToken, {
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  next();
};

/**
 * Launch SCORM player
 * GET /api/v1/content/scorm/player/:packageId/launch
 *
 * Returns HTML player interface with embedded content
 * Requires authentication (learners must be assigned)
 */
router.get('/:packageId/launch', attachTokenFromQuery, isAuthenticated(), launchPlayer);

/**
 * Serve SCORM content files
 * GET /api/v1/content/scorm/player/:packageId/content/*
 *
 * Serves static files from extracted SCORM package
 * Handles all content types (HTML, CSS, JS, images, videos, etc.)
 * Requires authentication with access verification
 */
router.get('/:packageId/content/*', attachTokenFromQuery, isAuthenticated(), serveContent);

/**
 * Exit player
 * POST /api/v1/content/scorm/player/:attemptId/exit
 *
 * Returns final attempt statistics
 * Requires learner authentication
 */
router.post('/:attemptId/exit', isAuthenticated(), isLearner, exitPlayer);

export default router;
