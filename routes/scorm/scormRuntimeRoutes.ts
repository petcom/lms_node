/**
 * SCORM Runtime API Routes
 *
 * Routes for SCORM Runtime API communication between
 * SCORM content and the LMS server.
 */

import express from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';
import {
  initializeSession,
  terminateSessionAPI,
  getCMIValueAPI,
  setCMIValueAPI,
  commitData,
  getLastError,
  heartbeat,
} from '../../controller/scorm/scormRuntimeCtrl';

const scormRuntimeRouter = express.Router();

scormRuntimeRouter.use(isAuthenticated());
scormRuntimeRouter.use(roleRestriction('global-admin', 'staff', 'learner'));

// Initialize session
scormRuntimeRouter.post('/:attemptId/initialize', initializeSession);

// Terminate session
scormRuntimeRouter.post('/:attemptId/terminate', terminateSessionAPI);

// Get CMI value
scormRuntimeRouter.get('/:attemptId/value/:element(*)', getCMIValueAPI);

// Set CMI value
scormRuntimeRouter.put('/:attemptId/value/:element(*)', setCMIValueAPI);

// Commit data
scormRuntimeRouter.post('/:attemptId/commit', commitData);

// Get last error
scormRuntimeRouter.get('/:attemptId/error', getLastError);

// Heartbeat
scormRuntimeRouter.post('/:attemptId/heartbeat', heartbeat);

export default scormRuntimeRouter;
