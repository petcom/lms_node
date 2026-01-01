import express, { Router } from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import {
  listStaffUsers,
  listDepartmentContent,
  listDepartmentHierarchy,
  updateStaffRoles,
  updateStaffDepartment,
  createDepartmentContent,
  updateDepartmentContent,
  createDepartmentProgram,
  updateDepartmentProgram,
  updateProgramDepartment,
  createDepartmentCourse,
  updateDepartmentCourse,
  updateCourseDepartment,
  updateCourseProgram,
  updateDepartment,
} from '../../controller/departmentResources/departmentResourcesCtrl';
import {
  staffUsersQuery,
  contentQuery,
  staffRolesUpdate,
  staffDepartmentUpdate,
  contentCreate,
  contentUpdate,
  programCreate,
  programUpdate,
  programDepartmentUpdate,
  courseCreate,
  courseUpdate,
  courseDepartmentUpdate,
  courseProgramUpdate,
  departmentUpdate,
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

departmentResourcesRouter.patch(
  '/staffusers/:id/role',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(staffRolesUpdate),
  updateStaffRoles
);

departmentResourcesRouter.patch(
  '/staffusers/:id/department',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(staffDepartmentUpdate),
  updateStaffDepartment
);

departmentResourcesRouter.get(
  '/content',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(contentQuery),
  listDepartmentContent
);

departmentResourcesRouter.post(
  '/content',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(contentCreate),
  createDepartmentContent
);

departmentResourcesRouter.patch(
  '/content/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(contentUpdate),
  updateDepartmentContent
);

departmentResourcesRouter.post(
  '/programs',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(programCreate),
  createDepartmentProgram
);

departmentResourcesRouter.patch(
  '/programs/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(programUpdate),
  updateDepartmentProgram
);

departmentResourcesRouter.patch(
  '/programs/:id/department',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(programDepartmentUpdate),
  updateProgramDepartment
);

departmentResourcesRouter.post(
  '/courses',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(courseCreate),
  createDepartmentCourse
);

departmentResourcesRouter.patch(
  '/courses/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(courseUpdate),
  updateDepartmentCourse
);

departmentResourcesRouter.patch(
  '/courses/:id/department',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(courseDepartmentUpdate),
  updateCourseDepartment
);

departmentResourcesRouter.patch(
  '/courses/:id/program',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(courseProgramUpdate),
  updateCourseProgram
);

departmentResourcesRouter.get(
  '/departments',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  listDepartmentHierarchy
);

departmentResourcesRouter.patch(
  '/departments/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(departmentUpdate),
  updateDepartment
);

export default departmentResourcesRouter;
