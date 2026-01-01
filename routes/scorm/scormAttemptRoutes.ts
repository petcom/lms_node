import express from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import {
  getAttemptsByPackage,
  getAttempt,
  updateCMI,
  getCMI,
  completeAttempt,
  getAllAttempts,
  getLearnerProgress,
} from '../../controller/scorm/scormAttemptCtrl';

const scormAttemptRouter = express.Router();

// Learner routes
scormAttemptRouter.get('/package/:packageId', isAuthenticated(), getAttemptsByPackage);
scormAttemptRouter.get('/:attemptId', isAuthenticated(), getAttempt);
scormAttemptRouter.put('/:attemptId/cmi', isAuthenticated(), updateCMI);
scormAttemptRouter.get('/:attemptId/cmi/:element', isAuthenticated(), getCMI);
scormAttemptRouter.post('/:attemptId/complete', isAuthenticated(), completeAttempt);

// Instructor/Admin routes
scormAttemptRouter.get('/', isAuthenticated(), isInstructorOrAdmin, getAllAttempts);
scormAttemptRouter.get(
  '/learner/:learnerId/summary',
  isAuthenticated(),
  isInstructorOrAdmin,
  getLearnerProgress
);

export default scormAttemptRouter;
