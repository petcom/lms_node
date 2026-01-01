import express, { Router } from 'express';
import mongoose from 'mongoose';
import {
  createClassLevel,
  getClassLevel,
  getClassLevels,
  updateClassLevel,
  deleteClassLevel,
  archiveClassLevel,
  unarchiveClassLevel,
} from '../../controller/academics/classLevelCtrl';
import advancedResults from '../../middlewares/advancedResults';
import ClassLevel from '../../model/Academic/ClassLevel';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';

const classLevelRouter: Router = express.Router();

/**
 * updated chained routes
 */
classLevelRouter
  .route('/')
  .post(isAuthenticated(), roleRestriction('global-admin'), createClassLevel)
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    advancedResults(ClassLevel, undefined, (req) => {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      const requestedDept =
        typeof req.query.department === 'string' ? req.query.department : undefined;
      const includeArchived = req.query.includeArchived === 'true';
      const archivedFilter = includeArchived ? {} : { archived: false };

      if (scope === 'all' && requestedDept && mongoose.isValidObjectId(requestedDept)) {
        return {
          ...archivedFilter,
          department: new mongoose.Types.ObjectId(requestedDept),
        } as any;
      }

      if (scope && scope !== 'all') {
        return { ...archivedFilter, department: { $in: scope } } as any;
      }

      return archivedFilter as any;
    }),
    getClassLevels
  );

classLevelRouter
  .route('/:id')
  .get(isAuthenticated(), departmentScope(), isInstructorOrAdmin, getClassLevel)
  .put(isAuthenticated(), roleRestriction('global-admin'), updateClassLevel)
  .delete(isAuthenticated(), roleRestriction('global-admin'), deleteClassLevel);

classLevelRouter.patch(
  '/:id/archive',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  archiveClassLevel
);

classLevelRouter.patch(
  '/:id/unarchive',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  unarchiveClassLevel
);

export default classLevelRouter;
