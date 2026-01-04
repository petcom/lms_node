import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated';
import roleRestriction from '../middlewares/roleRestriction';
import { getStaffRoles } from '../controller/lists/listsCtrl';

const listsRouter = express.Router();

listsRouter.get('/staff-roles', isAuthenticated(), roleRestriction('global-admin', 'staff'), getStaffRoles);

export default listsRouter;
