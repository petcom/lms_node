import express, { Router } from 'express';
import mongoose from 'mongoose';
import {
  createProgramLevel,
  getProgramLevel,
  getProgramLevels,
  updateProgramLevel,
  deleteProgramLevel,
  archiveProgramLevel,
  unarchiveProgramLevel,
} from '../../controller/academics/programLevelCtrl';
import advancedResults from '../../middlewares/advancedResults';
import ProgramLevel from '../../model/Academic/ProgramLevel';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import { createProgramLevel as createProgramLevelValidation, updateProgramLevel as updateProgramLevelValidation, idParam } from '../../validators/academicValidation';

const programLevelRouter: Router = express.Router();

programLevelRouter
  .route('/')
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(createProgramLevelValidation),
    createProgramLevel
  )
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    advancedResults(ProgramLevel, undefined, (req) => {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      const requestedDept =
        typeof req.query.department === 'string' ? req.query.department : undefined;
      const requestedProgram =
        typeof req.query.program === 'string' ? req.query.program : undefined;
      const includeArchived = req.query.includeArchived === 'true';
      const archivedFilter = includeArchived ? {} : { archived: false };

      if (scope === 'all' && requestedDept && mongoose.isValidObjectId(requestedDept)) {
        return {
          ...archivedFilter,
          department: new mongoose.Types.ObjectId(requestedDept),
          ...(requestedProgram && mongoose.isValidObjectId(requestedProgram)
            ? { program: new mongoose.Types.ObjectId(requestedProgram) }
            : {}),
        } as any;
      }

      if (scope && scope !== 'all') {
        return {
          ...archivedFilter,
          department: { $in: scope },
          ...(requestedProgram && mongoose.isValidObjectId(requestedProgram)
            ? { program: new mongoose.Types.ObjectId(requestedProgram) }
            : {}),
        } as any;
      }

      return {
        ...archivedFilter,
        ...(requestedProgram && mongoose.isValidObjectId(requestedProgram)
          ? { program: new mongoose.Types.ObjectId(requestedProgram) }
          : {}),
      } as any;
    }),
    getProgramLevels
  );

programLevelRouter
  .route('/:id')
  .get(isAuthenticated(), departmentScope(), isInstructorOrAdmin, validate(idParam), getProgramLevel)
  .put(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(updateProgramLevelValidation),
    updateProgramLevel
  )
  .delete(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    deleteProgramLevel
  );

programLevelRouter.patch(
  '/:id/archive',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(idParam),
  archiveProgramLevel
);

programLevelRouter.patch(
  '/:id/unarchive',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(idParam),
  unarchiveProgramLevel
);

export default programLevelRouter;
