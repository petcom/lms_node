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
  getLearnerProgressReport,
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
  learnerProgressParams,
} from '../../validators/contentValidation';

const contentRouter: Router = express.Router();

contentRouter.get(
  '/',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(contentListQuery),
  listContent
);

contentRouter.post(
  '/custom',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(customContentCreate),
  createCustomContent
);

contentRouter.patch(
  '/custom/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(customContentUpdate),
  updateCustomContent
);

contentRouter.get(
  '/courses/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(courseIdParam),
  getCourse
);

contentRouter.patch(
  '/courses/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(courseUpdate),
  updateCourse
);

contentRouter.get(
  '/courses/:id/render',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(courseIdParam),
  renderCourse
);

contentRouter.post(
  '/courses/:id/render',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
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
  '/reports/learner/:learnerId',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin', 'staff', 'learner'),
  validate(learnerProgressParams),
  getLearnerProgressReport
);

contentRouter.get(
  '/reports',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(reportsQuery),
  listReports
);

contentRouter.get(
  '/:id/attempts',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(contentIdParam),
  listAttempts
);

contentRouter.get(
  '/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  validate(contentIdParam),
  getContent
);

export default contentRouter;
