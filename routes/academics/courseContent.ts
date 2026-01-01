import express, { Router } from 'express';
import mongoose from 'mongoose';
import {
  createCourseContent,
  getCourseContent,
  getCourseContents,
  updateCourseContent,
  deleteCourseContent,
} from '../../controller/academics/courseContentCtrl';
import advancedResults from '../../middlewares/advancedResults';
import CourseContent from '../../model/Academic/CourseContent';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isInstructorOrAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import {
  createCourseContent as createCourseContentValidation,
  updateCourseContent as updateCourseContentValidation,
  idParam,
} from '../../validators/academicValidation';

const courseContentRouter: Router = express.Router();

courseContentRouter
  .route('/')
  .post(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(createCourseContentValidation),
    createCourseContent
  )
  .get(
    isAuthenticated(),
    departmentScope(),
    isInstructorOrAdmin,
    advancedResults(CourseContent, undefined, (req) => {
      const requestedCourse =
        typeof req.query.course === 'string' ? req.query.course : undefined;
      const requestedType =
        typeof req.query.contentType === 'string' ? req.query.contentType : undefined;

      return {
        ...(requestedCourse && mongoose.isValidObjectId(requestedCourse)
          ? { course: new mongoose.Types.ObjectId(requestedCourse) }
          : {}),
        ...(requestedType ? { contentType: requestedType } : {}),
      } as any;
    }),
    getCourseContents
  );

courseContentRouter
  .route('/:id')
  .get(isAuthenticated(), departmentScope(), isInstructorOrAdmin, validate(idParam), getCourseContent)
  .put(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(updateCourseContentValidation),
    updateCourseContent
  )
  .delete(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    validate(idParam),
    deleteCourseContent
  );

export default courseContentRouter;
