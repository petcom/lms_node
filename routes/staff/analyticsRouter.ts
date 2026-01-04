import express, { Router } from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import departmentScope from '../../middlewares/departmentScope';
import roleRestriction from '../../middlewares/roleRestriction';
import {
  getProgramAnalytics,
  getProgramLevelAnalytics,
  getProgramLevelDetail,
} from '../../controller/staff/analyticsCtrl';

const analyticsRouter: Router = express.Router();

analyticsRouter.get(
  '/programs',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  getProgramAnalytics
);

analyticsRouter.get(
  '/programs/:programId/levels',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  getProgramLevelAnalytics
);

analyticsRouter.get(
  '/programs/:programId/levels/:levelId',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff'),
  getProgramLevelDetail
);

export default analyticsRouter;
