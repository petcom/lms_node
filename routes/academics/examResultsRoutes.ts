import express, { Router } from 'express';
import {
  checkExamResults,
  getExamResults,
  adminToggleExamResult,
} from '../../controller/academics/examResults';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';

const examResultRouter: Router = express.Router();

examResultRouter.get('/:id/check', isAuthenticated(), roleRestriction('learner'), checkExamResults);
examResultRouter.get('/', isAuthenticated(), roleRestriction('learner'), getExamResults);

examResultRouter.put(
  '/:id/admin-toggle-publish',
  isAuthenticated(),
  roleRestriction('global-admin'),
  adminToggleExamResult
);

export default examResultRouter;
