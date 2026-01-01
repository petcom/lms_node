import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated';
import roleRestriction from '../middlewares/roleRestriction';
import { getMetricsSummary } from '../controller/metricsCtrl';

const metricsRouter = express.Router();

metricsRouter.get('/', isAuthenticated(), roleRestriction('global-admin', 'staff'), getMetricsSummary);

export default metricsRouter;
