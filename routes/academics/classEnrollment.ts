import express, { Router } from 'express';
import mongoose from 'mongoose';
import {
  createClassEnrollment,
  getClassEnrollment,
  getClassEnrollments,
  updateClassEnrollment,
  deleteClassEnrollment,
} from '../../controller/academics/classEnrollmentCtrl';
import { batchCreateClassEnrollments } from '../../controller/academics/enrollmentBatchCtrl';
import advancedResults from '../../middlewares/advancedResults';
import ClassEnrollment from '../../model/Academic/ClassEnrollment';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import {
  createClassEnrollment as createClassEnrollmentValidation,
  updateClassEnrollment as updateClassEnrollmentValidation,
  idParam,
} from '../../validators/academicValidation';
import { batchCreateClassEnrollments as batchCreateClassEnrollmentsValidation } from '../../validators/batchValidators';

const classEnrollmentRouter: Router = express.Router();

// Batch endpoint - must be before /:id route
classEnrollmentRouter
  .route('/batch')
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(batchCreateClassEnrollmentsValidation),
    batchCreateClassEnrollments
  );

classEnrollmentRouter
  .route('/')
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(createClassEnrollmentValidation),
    createClassEnrollment
  )
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    advancedResults(ClassEnrollment, undefined, (req) => {
      const learner = typeof req.query.learner === 'string' ? req.query.learner : undefined;
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;

      return {
        ...(learner && mongoose.isValidObjectId(learner)
          ? { learner: new mongoose.Types.ObjectId(learner) }
          : {}),
        ...(classId && mongoose.isValidObjectId(classId)
          ? { class: new mongoose.Types.ObjectId(classId) }
          : {}),
      } as any;
    }),
    getClassEnrollments
  );

classEnrollmentRouter
  .route('/:id')
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    validate(idParam),
    getClassEnrollment
  )
  .put(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(updateClassEnrollmentValidation),
    updateClassEnrollment
  )
  .delete(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    deleteClassEnrollment
  );

export default classEnrollmentRouter;
