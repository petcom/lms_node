import express, { Router } from 'express';
import mongoose from 'mongoose';
import {
  createCourseEnrollment,
  getCourseEnrollment,
  getCourseEnrollments,
  updateCourseEnrollment,
  deleteCourseEnrollment,
} from '../../controller/academics/courseEnrollmentCtrl';
import { batchCreateCourseEnrollments } from '../../controller/academics/enrollmentBatchCtrl';
import advancedResults from '../../middlewares/advancedResults';
import CourseEnrollment from '../../model/Academic/CourseEnrollment';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import {
  createCourseEnrollment as createCourseEnrollmentValidation,
  updateCourseEnrollment as updateCourseEnrollmentValidation,
  idParam,
} from '../../validators/academicValidation';
import { batchCreateCourseEnrollments as batchCreateCourseEnrollmentsValidation } from '../../validators/batchValidators';

const courseEnrollmentRouter: Router = express.Router();

// Batch endpoint - must be before /:id route
courseEnrollmentRouter
  .route('/batch')
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(batchCreateCourseEnrollmentsValidation),
    batchCreateCourseEnrollments
  );

courseEnrollmentRouter
  .route('/')
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(createCourseEnrollmentValidation),
    createCourseEnrollment
  )
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    advancedResults(CourseEnrollment, undefined, (req) => {
      const learner = typeof req.query.learner === 'string' ? req.query.learner : undefined;
      const course = typeof req.query.course === 'string' ? req.query.course : undefined;
      const classId = typeof req.query.classId === 'string' ? req.query.classId : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;

      return {
        ...(learner && mongoose.isValidObjectId(learner)
          ? { learner: new mongoose.Types.ObjectId(learner) }
          : {}),
        ...(course && mongoose.isValidObjectId(course)
          ? { course: new mongoose.Types.ObjectId(course) }
          : {}),
        ...(classId && mongoose.isValidObjectId(classId)
          ? { class: new mongoose.Types.ObjectId(classId) }
          : {}),
        ...(status ? { status } : {}),
      } as any;
    }),
    getCourseEnrollments
  );

courseEnrollmentRouter
  .route('/:id')
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    validate(idParam),
    getCourseEnrollment
  )
  .put(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(updateCourseEnrollmentValidation),
    updateCourseEnrollment
  )
  .delete(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    deleteCourseEnrollment
  );

export default courseEnrollmentRouter;
