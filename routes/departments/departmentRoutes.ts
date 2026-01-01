import express, { Router } from 'express';
import {
  createDepartment,
  getDepartments,
  getDepartmentHierarchy,
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
  .post(isAuthenticated(), departmentScope(), roleRestriction('global-admin'), createDepartment)
  .get(
    isAuthenticated(),
    departmentScope(),
    roleRestriction('global-admin'),
    advancedResults(Department, undefined, scopedFilter),
    getDepartments
  );

departmentRouter.get(
  '/hierarchy',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  getDepartmentHierarchy
);

departmentRouter
  .route('/:id')
  .get(isAuthenticated(), departmentScope(), roleRestriction('global-admin'), getDepartment)
  .put(isAuthenticated(), departmentScope(), roleRestriction('global-admin'), updateDepartment)
  .delete(isAuthenticated(), departmentScope(), roleRestriction('global-admin'), deleteDepartment);

export default departmentRouter;
