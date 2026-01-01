import express, { Router } from 'express';
import { getPermissionsMatrix } from '../controller/permissionsCtrl';
import isAuthenticated from '../middlewares/isAuthenticated';
import roleRestriction from '../middlewares/roleRestriction';

const permissionsRouter: Router = express.Router();

permissionsRouter.get('/matrix', isAuthenticated(), roleRestriction('global-admin'), getPermissionsMatrix);

export default permissionsRouter;
