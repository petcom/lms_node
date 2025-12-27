import express, { Router } from 'express';
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} from '../../controller/academics/departmentCtrl';
import isAuthenticated from '../../middlewares/isAuthenticated';
import departmentScope from '../../middlewares/departmentScope';
import roleRestriction from '../../middlewares/roleRestriction';
import advancedResults from '../../middlewares/advancedResults';
import Department from '../../model/Academic/Department';

const departmentRouter: Router = express.Router();

const scopedFilter = (req: express.Request) => {
  const scope = req.departmentScope?.accessibleDepartmentIds;
  if (scope && scope !== 'all') {
    return { _id: { $in: scope } } as any;
  }
  return {} as any;
};

departmentRouter
  .route('/')
  .post(isAuthenticated(), departmentScope(), roleRestriction('admin'), createDepartment)
  .get(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('admin'),
    advancedResults(Department, undefined, scopedFilter),
    getDepartments
  );

departmentRouter
  .route('/:id')
  .get(isAuthenticated(), departmentScope(), roleRestriction('admin'), getDepartment)
  .put(isAuthenticated(), departmentScope(), roleRestriction('admin'), updateDepartment)
  .delete(isAuthenticated(), departmentScope(), roleRestriction('admin'), deleteDepartment);

export default departmentRouter;
