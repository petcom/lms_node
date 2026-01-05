import express, { Router } from 'express';
import mongoose from 'mongoose';
import {
  createProgram,
  getPrograms,
  getSingleProgram,
  updateProgram,
  deleteProgram,
  archiveProgram,
  unarchiveProgram,
  getProgramCourses,
} from '../../controller/academics/programsCtrl';
import advancedResults from '../../middlewares/advancedResults';
import Program from '../../model/Academic/Program';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';

const programRouter: Router = express.Router();

/**
 * updated chained routes
 */
programRouter
  .route('/')
  .post(isAuthenticated(), roleRestriction('global-admin'), createProgram)
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    advancedResults(Program, undefined, (req) => {
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
    getPrograms
  );

programRouter
  .route('/:id')
  .get(isAuthenticated(), departmentScope(), isInstructorOrAdmin, getSingleProgram)
  .put(isAuthenticated(), roleRestriction('global-admin'), updateProgram)
  .delete(isAuthenticated(), roleRestriction('global-admin'), deleteProgram);

programRouter.get(
  '/:id/courses',
  isAuthenticated(),
  departmentScope(),
  isInstructorOrAdmin,
  getProgramCourses
);

programRouter.patch(
  '/:id/archive',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  archiveProgram
);

programRouter.patch(
  '/:id/unarchive',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  unarchiveProgram
);

export default programRouter;
