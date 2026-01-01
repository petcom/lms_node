import express, { Router } from 'express';
import isAuthenticated from '../../middlewares/isAuthenticated';
import departmentScope from '../../middlewares/departmentScope';
import roleRestriction from '../../middlewares/roleRestriction';
import validate from '../../middlewares/validate';
import {
  getMasterCss,
  updateMasterCss,
  scoreTemplateCss,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
} from '../../controller/templates/templatesCtrl';
import {
  masterCssParam,
  masterCssUpdate,
  scoreRequest,
  templateListQuery,
  templateCreate,
  templateUpdate,
  templateIdParam,
} from '../../validators/templateValidation';

const templatesRouter: Router = express.Router();

// Master CSS
templatesRouter.get(
  '/departments/:id/master-css',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin', 'staff'),
  validate(masterCssParam),
  getMasterCss
);

templatesRouter.put(
  '/departments/:id/master-css',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(masterCssUpdate),
  updateMasterCss
);

// Score endpoint
templatesRouter.post(
  '/score',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin', 'staff'),
  validate(scoreRequest),
  scoreTemplateCss
);

// Templates
templatesRouter.get(
  '/',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin', 'staff'),
  validate(templateListQuery),
  listTemplates
);

templatesRouter.post(
  '/',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(templateCreate),
  createTemplate
);

templatesRouter.get(
  '/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin', 'staff'),
  validate(templateIdParam),
  getTemplate
);

templatesRouter.patch(
  '/:id',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(templateUpdate),
  updateTemplate
);

templatesRouter.post(
  '/:id/publish',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(templateIdParam),
  publishTemplate
);

templatesRouter.post(
  '/:id/archive',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(templateIdParam),
  archiveTemplate
);

export default templatesRouter;
