import express from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { isTeacherOrAdmin } from '../../middlewares/roleRestriction';
import {
  launchPackage,
  getContentFile,
  getManifest,
} from '../../controller/scorm/scormContentCtrl';

const scormContentRouter = express.Router();

// Launch package (Student)
scormContentRouter.get('/:packageId/launch', isAuthenticated(), launchPackage);

// Get manifest (Teacher/Admin)
scormContentRouter.get(
  '/:packageId/manifest',
  isAuthenticated(),
  isTeacherOrAdmin,
  getManifest
);

// Serve content files (Student) - This must be last to catch all paths
scormContentRouter.get('/:packageId/*', isAuthenticated(), getContentFile);

export default scormContentRouter;
