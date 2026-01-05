import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated';
import roleRestriction from '../middlewares/roleRestriction';
import { getStaffRoles, getCourseStatuses } from '../controller/lists/listsCtrl';

const listsRouter = express.Router();

listsRouter.get('/staff-roles', isAuthenticated(), roleRestriction('global-admin', 'staff'), getStaffRoles);

listsRouter.get(
  '/course-statuses',
  isAuthenticated(),
  roleRestriction('global-admin', 'staff'),
  getCourseStatuses
);

export default listsRouter;
