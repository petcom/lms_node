import express, { Router } from 'express';
import mongoose from 'mongoose';
import {
  createCourse,
  getCourse,
  getCourses,
  updateCourse,
  deleteCourse,
  archiveCourse,
  unarchiveCourse,
  publishCourse,
  unpublishCourse,
} from '../../controller/academics/courseCtrl';
import advancedResults from '../../middlewares/advancedResults';
import Course from '../../model/Content/Course';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import { createCourse as createCourseValidation, updateCourse as updateCourseValidation, idParam } from '../../validators/academicValidation';

const courseRouter: Router = express.Router();

courseRouter
  .route('/')
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(createCourseValidation),
    createCourse
  )
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    advancedResults(Course, undefined, (req) => {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      const requestedDept =
        typeof req.query.department === 'string' ? req.query.department : undefined;
      const requestedProgram =
        typeof req.query.program === 'string' ? req.query.program : undefined;
      const requestedProgramLevel =
        typeof req.query.programLevel === 'string' ? req.query.programLevel : undefined;
      const includeArchived = req.query.includeArchived === 'true';
      const archivedFilter = includeArchived ? {} : { isArchived: false };

      const programFilter =
        requestedProgram && mongoose.isValidObjectId(requestedProgram)
          ? { program: new mongoose.Types.ObjectId(requestedProgram) }
          : {};
      const programLevelFilter =
        requestedProgramLevel && mongoose.isValidObjectId(requestedProgramLevel)
          ? { programLevel: new mongoose.Types.ObjectId(requestedProgramLevel) }
          : {};

      if (scope === 'all' && requestedDept && mongoose.isValidObjectId(requestedDept)) {
        return {
          ...archivedFilter,
          ...programFilter,
          ...programLevelFilter,
          department: new mongoose.Types.ObjectId(requestedDept),
        } as any;
      }

      if (scope && scope !== 'all') {
        return {
          ...archivedFilter,
          ...programFilter,
          ...programLevelFilter,
          department: { $in: scope },
        } as any;
      }

      return {
        ...archivedFilter,
        ...programFilter,
        ...programLevelFilter,
      } as any;
    }),
    getCourses
  );

courseRouter
  .route('/:id')
  .get(isAuthenticated(), departmentScope(), isInstructorOrAdmin, validate(idParam), getCourse)
  .put(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(updateCourseValidation),
    updateCourse
  )
  .delete(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    deleteCourse
  );

courseRouter.patch(
  '/:id/archive',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(idParam),
  archiveCourse
);

courseRouter.patch(
  '/:id/unarchive',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(idParam),
  unarchiveCourse
);

courseRouter.patch(
  '/:id/publish',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(idParam),
  publishCourse
);

courseRouter.patch(
  '/:id/unpublish',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(idParam),
  unpublishCourse
);

export default courseRouter;
