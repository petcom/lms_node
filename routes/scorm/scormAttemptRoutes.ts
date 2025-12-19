import express from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { isTeacherOrAdmin } from '../../middlewares/roleRestriction';
import {
  getAttemptsByPackage,
  getAttempt,
  updateCMI,
  getCMI,
  completeAttempt,
  getAllAttempts,
  getStudentProgress,
} from '../../controller/scorm/scormAttemptCtrl';

const scormAttemptRouter = express.Router();

// Student routes
scormAttemptRouter.get('/package/:packageId', isAuthenticated, getAttemptsByPackage);
scormAttemptRouter.get('/:attemptId', isAuthenticated, getAttempt);
scormAttemptRouter.put('/:attemptId/cmi', isAuthenticated, updateCMI);
scormAttemptRouter.get('/:attemptId/cmi/:element', isAuthenticated, getCMI);
scormAttemptRouter.post('/:attemptId/complete', isAuthenticated, completeAttempt);

// Teacher/Admin routes
scormAttemptRouter.get('/', isAuthenticated, isTeacherOrAdmin, getAllAttempts);
scormAttemptRouter.get(
  '/student/:studentId/summary',
  isAuthenticated,
  isTeacherOrAdmin,
  getStudentProgress
);

export default scormAttemptRouter;
