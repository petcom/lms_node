import express, { Router } from 'express';
import mongoose from 'mongoose';
import {
  createSubject,
  getSubjects,
  getSubject,
  updateSubject,
  deleteSubject,
} from '../../controller/academics/subjectCtrl';
import advancedResults from '../../middlewares/advancedResults';
import Subject from '../../model/Academic/Subject';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction, { isTeacherOrAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';

const subjectRouter: Router = express.Router();

/**
 * updated chained routes
 */
subjectRouter.post('/:programID', isAuthenticated(), roleRestriction('admin'), createSubject);
subjectRouter.get(
  '/',
  isAuthenticated(),
  departmentScope(),
  isTeacherOrAdmin,
  advancedResults(Subject, undefined, (req) => {
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const requestedDept =
      typeof req.query.department === 'string' ? req.query.department : undefined;

    if (scope === 'all' && requestedDept && mongoose.isValidObjectId(requestedDept)) {
      return { department: new mongoose.Types.ObjectId(requestedDept) } as any;
    }

    if (scope && scope !== 'all') {
      return { department: { $in: scope } } as any;
    }

    return {} as any;
  }),
  getSubjects
);
subjectRouter.get('/:id', isAuthenticated(), departmentScope(), isTeacherOrAdmin, getSubject);
subjectRouter.put('/:id', isAuthenticated(), roleRestriction('admin'), updateSubject);
subjectRouter.delete('/:id', isAuthenticated(), roleRestriction('admin'), deleteSubject);

export default subjectRouter;
