import express, { Router } from 'express';
import {
  adminRegisterLearner,
  loginLearner,
  getLearnerProfile,
  getAllLearnersByAdmin,
  getLearnerByAdmin,
  learnerUpdateProfile,
  adminUpdateLearner,
  writeExam,
} from '../../controller/learners/learnersCtrl';
import advancedResults from '../../middlewares/advancedResults';
import Learner from '../../model/Academic/Learner';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';

const learnerRouter: Router = express.Router();

/**
 * @swagger
 * /api/v1/learners/admin/register:
 *   post:
 *     summary: Admin registers a new learner
 *     tags: [Learners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Learner registered successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
learnerRouter.post(
  '/admin/register',
  isAuthenticated(),
  roleRestriction('global-admin'),
  adminRegisterLearner
);

/**
 * @swagger
 * /api/v1/learners/login:
 *   post:
 *     summary: Learner login
 *     tags: [Learners]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [learner]
 */
learnerRouter.post('/login', loginLearner);
/**
 * @swagger
 * /api/v1/learners/profile:
 *   get:
 *     summary: Get learner profile
 *     tags: [Learners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Learner profile retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
learnerRouter.get('/profile', isAuthenticated(), roleRestriction('learner'), getLearnerProfile);
learnerRouter.get(
  '/admin',
  isAuthenticated(),
  roleRestriction('global-admin'),
  advancedResults(Learner),
  getAllLearnersByAdmin
);
learnerRouter.get(
  '/:learnerID/admin',
  isAuthenticated(),
  roleRestriction('global-admin'),
  getLearnerByAdmin
);
/** Learners taking exams can access following: */
learnerRouter.post(
  '/exams/:examID/write',
  isAuthenticated(),
  roleRestriction('learner'),
  writeExam
); // Learner only writes exams
/** */
learnerRouter.put('/update', isAuthenticated(), roleRestriction('learner'), learnerUpdateProfile); // learner only
learnerRouter.put(
  '/:learnerID/update/admin',
  isAuthenticated(),
  roleRestriction('global-admin'),
  adminUpdateLearner
); // Admin only

export default learnerRouter;
