import express, { Router } from 'express';
import {
  checkExamResults,
  getExamResults,
  adminToggleExamResult,
} from '../../controller/academics/examResults';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';

const examResultRouter: Router = express.Router();

examResultRouter.get('/:id/check', isAuthenticated(), roleRestriction('student'), checkExamResults);
examResultRouter.get('/', isAuthenticated(), roleRestriction('student'), getExamResults);

examResultRouter.put(
  '/:id/admin-toggle-publish',
  isAuthenticated(),
  roleRestriction('admin'),
  adminToggleExamResult
);

export default examResultRouter;
