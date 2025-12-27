import express, { Router } from 'express';
import {
  createAcademicTerm,
  getAcademicTerm,
  deleteAcademicTerm,
  getAcademicTerms,
  updateAcademicTerms,
} from '../../controller/academics/academicTermCtrl';
import advancedResults from '../../middlewares/advancedResults';
import AcademicTerm from '../../model/Academic/AcademicTerm';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';

const academicTermRouter: Router = express.Router();

/**
 * updated chained routes
 */
academicTermRouter
  .route('/')
  .post(isAuthenticated(), roleRestriction('admin'), createAcademicTerm)
  .get(
    isAuthenticated(),
    roleRestriction('admin'),
    advancedResults(AcademicTerm),
    getAcademicTerms
  );

academicTermRouter
  .route('/:id')
  .get(isAuthenticated(), roleRestriction('admin'), getAcademicTerm)
  .put(isAuthenticated(), roleRestriction('admin'), updateAcademicTerms)
  .delete(isAuthenticated(), roleRestriction('admin'), deleteAcademicTerm);

export default academicTermRouter;
