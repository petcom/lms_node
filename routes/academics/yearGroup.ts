import express, { Router } from 'express';
import {
  createYearGroup,
  getYearGroups,
  getYearGroup,
  updateYearGroup,
  deleteYearGroup,
} from '../../controller/academics/yearGroupsCtrl';
import advancedResults from '../../middlewares/advancedResults';
import YearGroup from '../../model/Academic/YearGroup';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';

const yearGroupRouter: Router = express.Router();

/**
 * updated chained routes
 */
yearGroupRouter
  .route('/')
  .post(isAuthenticated(), roleRestriction('global-admin'), createYearGroup)
  .get(isAuthenticated(), roleRestriction('global-admin'), advancedResults(YearGroup), getYearGroups);

yearGroupRouter
  .route('/:id')
  .get(isAuthenticated(), roleRestriction('global-admin'), getYearGroup)
  .put(isAuthenticated(), roleRestriction('global-admin'), updateYearGroup)
  .delete(isAuthenticated(), roleRestriction('global-admin'), deleteYearGroup);

export default yearGroupRouter;
