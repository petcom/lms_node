import express, { Router } from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import {
  listStaffUsers,
  listDepartmentContent,
  listDepartmentHierarchy,
} from '../../controller/departmentResources/departmentResourcesCtrl';
import {
  staffUsersQuery,
  contentQuery,
} from '../../validators/departmentResourcesValidation';

const departmentResourcesRouter: Router = express.Router();

departmentResourcesRouter.get(
  '/staffusers',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(staffUsersQuery),
  listStaffUsers
);

departmentResourcesRouter.get(
  '/content',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(contentQuery),
  listDepartmentContent
);

departmentResourcesRouter.get(
  '/departments',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  listDepartmentHierarchy
);

export default departmentResourcesRouter;

