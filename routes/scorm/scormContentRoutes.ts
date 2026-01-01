import express from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import {
  launchPackage,
  getContentFile,
  getManifest,
} from '../../controller/scorm/scormContentCtrl';

const scormContentRouter = express.Router();

// Launch package (Learner)
scormContentRouter.get('/:packageId/launch', isAuthenticated(), launchPackage);

// Get manifest (Instructor/Admin)
scormContentRouter.get('/:packageId/manifest', isAuthenticated(), isInstructorOrAdmin, getManifest);

// Serve content files (Learner) - This must be last to catch all paths
scormContentRouter.get('/:packageId/*', isAuthenticated(), getContentFile);

export default scormContentRouter;
