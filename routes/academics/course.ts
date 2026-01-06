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
    // DCV-044: Course no longer has department field - filter via Program lookup
    async (req, _res, next) => {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      const requestedDept =
        typeof req.query.department === 'string' ? req.query.department : undefined;
      
      // Pre-fetch program IDs that match the department scope
      let programIds: mongoose.Types.ObjectId[] | undefined;
      
      if (scope === 'all' && requestedDept && mongoose.isValidObjectId(requestedDept)) {
        // Master admin filtering by specific department
        const Program = mongoose.model('Program');
        const programs = await Program.find({ department: new mongoose.Types.ObjectId(requestedDept) }).select('_id').lean();
        programIds = programs.map(p => p._id as mongoose.Types.ObjectId);
      } else if (scope && scope !== 'all') {
        // Non-master admin - filter to their scope
        const Program = mongoose.model('Program');
        const programs = await Program.find({ department: { $in: scope } }).select('_id').lean();
        programIds = programs.map(p => p._id as mongoose.Types.ObjectId);
      }
      
      // Store program IDs in request for advancedResults to use
      (req as any)._scopedProgramIds = programIds;
      next();
    },
    advancedResults(Course, undefined, (req) => {
      const requestedProgram =
        typeof req.query.program === 'string' ? req.query.program : undefined;
      const requestedProgramLevel =
        typeof req.query.programLevel === 'string' ? req.query.programLevel : undefined;
      const includeArchived = req.query.includeArchived === 'true';
      const archivedFilter = includeArchived ? {} : { isArchived: false };
      const scopedProgramIds = (req as any)._scopedProgramIds;

      const programLevelFilter =
        requestedProgramLevel && mongoose.isValidObjectId(requestedProgramLevel)
          ? { programLevel: new mongoose.Types.ObjectId(requestedProgramLevel) }
          : {};

      // DCV-044: Filter by program IDs (derived from department scope)
      if (scopedProgramIds !== undefined) {
        return {
          ...archivedFilter,
          ...programLevelFilter,
          program: { $in: scopedProgramIds },
          ...(requestedProgram && mongoose.isValidObjectId(requestedProgram)
            ? { program: new mongoose.Types.ObjectId(requestedProgram) }
            : {}),
        } as any;
      }

      return {
        ...archivedFilter,
        ...programLevelFilter,
        ...(requestedProgram && mongoose.isValidObjectId(requestedProgram)
          ? { program: new mongoose.Types.ObjectId(requestedProgram) }
          : {}),
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
  .patch(
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

// Publish endpoint with both PATCH (existing) and POST (alias for contract compliance)
courseRouter
  .route('/:id/publish')
  .patch(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    publishCourse
  )
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    publishCourse
  );

// Unpublish endpoint with both PATCH (existing) and POST (alias for contract compliance)
courseRouter
  .route('/:id/unpublish')
  .patch(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    unpublishCourse
  )
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    unpublishCourse
  );

export default courseRouter;
