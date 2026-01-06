import express, { Router } from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import { deprecatedEndpoint } from '../../middlewares/deprecation';
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
  roleRestriction('global-admin'),
  validate(staffUsersQuery),
  listStaffUsers
);

departmentResourcesRouter.patch(
  '/staffusers/:id/role',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(staffRolesUpdate),
  updateStaffRoles
);

departmentResourcesRouter.patch(
  '/staffusers/:id/department',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(staffDepartmentUpdate),
  updateStaffDepartment
);

departmentResourcesRouter.get(
  '/content',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(contentQuery),
  listDepartmentContent
);

departmentResourcesRouter.post(
  '/content',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(contentCreate),
  createDepartmentContent
);

departmentResourcesRouter.patch(
  '/content/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(contentUpdate),
  updateDepartmentContent
);

// DEPRECATED: Use POST /api/v1/programs instead
departmentResourcesRouter.post(
  '/programs',
  deprecatedEndpoint('/api/v1/programs', '2026-06-01'),
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(programCreate),
  createDepartmentProgram
);

// DEPRECATED: Use PUT /api/v1/programs/:id instead
departmentResourcesRouter.patch(
  '/programs/:id',
  deprecatedEndpoint('/api/v1/programs/:id', '2026-06-01'),
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(programUpdate),
  updateDepartmentProgram
);

departmentResourcesRouter.patch(
  '/programs/:id/department',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(programDepartmentUpdate),
  updateProgramDepartment
);

// DEPRECATED: Use POST /api/v1/courses instead
departmentResourcesRouter.post(
  '/courses',
  deprecatedEndpoint('/api/v1/courses', '2026-06-01'),
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(courseCreate),
  createDepartmentCourse
);

// DEPRECATED: Use PUT /api/v1/courses/:id instead
departmentResourcesRouter.patch(
  '/courses/:id',
  deprecatedEndpoint('/api/v1/courses/:id', '2026-06-01'),
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(courseUpdate),
  updateDepartmentCourse
);

departmentResourcesRouter.patch(
  '/courses/:id/department',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(courseDepartmentUpdate),
  updateCourseDepartment
);

departmentResourcesRouter.patch(
  '/courses/:id/program',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(courseProgramUpdate),
  updateCourseProgram
);

departmentResourcesRouter.get(
  '/departments',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  listDepartmentHierarchy
);

departmentResourcesRouter.patch(
  '/departments/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(departmentUpdate),
  updateDepartment
);

export default departmentResourcesRouter;
