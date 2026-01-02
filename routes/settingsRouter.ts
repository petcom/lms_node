import express, { Router } from 'express';
import isAuthenticated from '../middlewares/isAuthenticated';
import roleRestriction from '../middlewares/roleRestriction';
import validate from '../middlewares/validate';
import { getSettings, updateSettings } from '../controller/settingsCtrl';
import { updateSettings as updateSettingsValidation } from '../validators/settingsValidation';

const settingsRouter: Router = express.Router();

settingsRouter.get('/', isAuthenticated(), roleRestriction('global-admin'), getSettings);
settingsRouter.put(
  '/',
  isAuthenticated(),
  roleRestriction('global-admin'),
  validate(updateSettingsValidation),
  updateSettings
);

export default settingsRouter;
