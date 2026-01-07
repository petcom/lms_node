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
  getCourseHistory,
} from '../../controller/learners/learnersCtrl';
import advancedResults from '../../middlewares/advancedResults';
import Learner from '../../model/Academic/Learner';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';

const learnerRouter: Router = express.Router();

/**
 * @swagger
 * /api/v1/learners/admins/register:
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
  '/admins/register',
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
  '/admins',
  isAuthenticated(),
  roleRestriction('global-admin'),
  advancedResults(Learner),
  getAllLearnersByAdmin
);
learnerRouter.get(
  '/:learnerID/admins',
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
  '/:learnerID/update/admins',
  isAuthenticated(),
  roleRestriction('global-admin'),
  adminUpdateLearner
); // Admin only

/**
 * @swagger
 * /api/v1/learners/{id}/course-history:
 *   get:
 *     summary: Get unified course history for a learner
 *     tags: [Learners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Learner ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, passed, failed, withdrawn]
 *         description: Filter by enrollment status
 *       - in: query
 *         name: programId
 *         schema:
 *           type: string
 *         description: Filter by program ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Course history fetched successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Learner not found
 */
learnerRouter.get(
  '/:id/course-history',
  isAuthenticated(),
  roleRestriction('global-admin'),
  getCourseHistory
);

export default learnerRouter;
