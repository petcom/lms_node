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
    // DCV-044: ProgramLevel no longer has department field - filter via Program lookup
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
        programIds = programs.map(p => p._id);
      } else if (scope && scope !== 'all') {
        // Non-master admin - filter to their scope
        const Program = mongoose.model('Program');
        const programs = await Program.find({ department: { $in: scope } }).select('_id').lean();
        programIds = programs.map(p => p._id);
      }
      
      // Store program IDs in request for advancedResults to use
      (req as any)._scopedProgramIds = programIds;
      next();
    },
    advancedResults(ProgramLevel, undefined, (req) => {
      const requestedProgram =
        typeof req.query.program === 'string' ? req.query.program : undefined;
      const includeArchived = req.query.includeArchived === 'true';
      const archivedFilter = includeArchived ? {} : { archived: false };
      const scopedProgramIds = (req as any)._scopedProgramIds;

      // DCV-044: Filter by program IDs (derived from department scope)
      if (scopedProgramIds !== undefined) {
        return {
          ...archivedFilter,
          program: { $in: scopedProgramIds },
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
