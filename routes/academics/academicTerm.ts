import express, { Router } from 'express';
import {
  createAcademicTerm,
  getAcademicTerm,
  deleteAcademicTerm,
  getAcademicTerms,
  updateAcademicTerms,
  archiveAcademicTerm,
  unarchiveAcademicTerm,
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
  .post(isAuthenticated(), roleRestriction('global-admin'), createAcademicTerm)
  .get(
    isAuthenticated(),
    roleRestriction('global-admin'),
    advancedResults(AcademicTerm, undefined, (req) => {
      const includeArchived = req.query.includeArchived === 'true';
      return includeArchived ? ({} as any) : ({ archived: false } as any);
    }),
    getAcademicTerms
  );

academicTermRouter
  .route('/:id')
  .get(isAuthenticated(), roleRestriction('global-admin'), getAcademicTerm)
  .put(isAuthenticated(), roleRestriction('global-admin'), updateAcademicTerms)
  .delete(isAuthenticated(), roleRestriction('global-admin'), deleteAcademicTerm);

academicTermRouter.patch(
  '/:id/archive',
  isAuthenticated(),
  roleRestriction('global-admin'),
  archiveAcademicTerm
);

academicTermRouter.patch(
  '/:id/unarchive',
  isAuthenticated(),
  roleRestriction('global-admin'),
  unarchiveAcademicTerm
);

export default academicTermRouter;
