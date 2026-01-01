import express, { Router } from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import {
  listContent,
  getContent,
  createCustomContent,
  updateCustomContent,
  getCourse,
  updateCourse,
  renderCourse,
  forceRenderCourse,
  recordCustomProgress,
  listAttempts,
  listReports,
} from '../../controller/content/contentCtrl';
import {
  contentListQuery,
  contentIdParam,
  customContentCreate,
  customContentUpdate,
  courseUpdate,
  courseIdParam,
  customProgress,
  reportsQuery,
} from '../../validators/contentValidation';

const contentRouter: Router = express.Router();

contentRouter.get(
  '/',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(contentListQuery),
  listContent
);

contentRouter.post(
  '/custom',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(customContentCreate),
  createCustomContent
);

contentRouter.patch(
  '/custom/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(customContentUpdate),
  updateCustomContent
);

contentRouter.get(
  '/courses/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(courseIdParam),
  getCourse
);

contentRouter.patch(
  '/courses/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(courseUpdate),
  updateCourse
);

contentRouter.get(
  '/courses/:id/render',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(courseIdParam),
  renderCourse
);

contentRouter.post(
  '/courses/:id/render',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(courseIdParam),
  forceRenderCourse
);

contentRouter.post(
  '/custom/:id/progress',
  isAuthenticated(),
  validate(customProgress),
  recordCustomProgress
);

contentRouter.get(
  '/reports',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(reportsQuery),
  listReports
);

contentRouter.get(
  '/:id/attempts',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(contentIdParam),
  listAttempts
);

contentRouter.get(
  '/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(contentIdParam),
  getContent
);

export default contentRouter;
