import express, { Router } from 'express';
import mongoose from 'mongoose';
import {
  createProgramEnrollment,
  getProgramEnrollment,
  getProgramEnrollments,
  updateProgramEnrollment,
  deleteProgramEnrollment,
} from '../../controller/academics/programEnrollmentCtrl';
import advancedResults from '../../middlewares/advancedResults';
import ProgramEnrollment from '../../model/Academic/ProgramEnrollment';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import {
  createProgramEnrollment as createProgramEnrollmentValidation,
  updateProgramEnrollment as updateProgramEnrollmentValidation,
  idParam,
} from '../../validators/academicValidation';

const programEnrollmentRouter: Router = express.Router();

programEnrollmentRouter
  .route('/')
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(createProgramEnrollmentValidation),
    createProgramEnrollment
  )
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    advancedResults(ProgramEnrollment, undefined, (req) => {
      const learner = typeof req.query.learner === 'string' ? req.query.learner : undefined;
      const program = typeof req.query.program === 'string' ? req.query.program : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;

      return {
        ...(learner && mongoose.isValidObjectId(learner)
          ? { learner: new mongoose.Types.ObjectId(learner) }
          : {}),
        ...(program && mongoose.isValidObjectId(program)
          ? { program: new mongoose.Types.ObjectId(program) }
          : {}),
        ...(status ? { status } : {}),
      } as any;
    }),
    getProgramEnrollments
  );

programEnrollmentRouter
  .route('/:id')
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    validate(idParam),
    getProgramEnrollment
  )
  .put(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(updateProgramEnrollmentValidation),
    updateProgramEnrollment
  )
  .delete(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    deleteProgramEnrollment
  );

export default programEnrollmentRouter;
