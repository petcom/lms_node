import express, { Router } from 'express';
import {
  registerAdminCtrl,
  loginAdminCtrl,
  getAdminsCtrl,
  getAdminProfileCtrl,
  updateAdminCtrl,
  adminSuspendTeacherCtrl,
  adminUnsuspendteacherCtrl,
  adminWithdrawTeacherCtrl,
  adminUnwithdrawTeacherCtrl,
  adminSuspendStudentCtrl,
  adminUnsuspendStudentCtrl,
  adminWithdrawStudentCtrl,
  adminUnwithdrawStudentCtrl,
  adminPublishResultsCtrl,
  adminUnpublishResultsCtrl,
} from '../../controller/staff/adminCtrl';

import Admin from '../../model/Staff/Admin';
import advancedResults from '../../middlewares/advancedResults';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import validate from '../../middlewares/validate';
import { registerAdmin, login } from '../../validators/authValidation';
import { updateAdminProfile, staffAction } from '../../validators/staffValidation';
import { idParam } from '../../validators/academicValidation';
import { registerLimiter, authLimiter } from '../../middlewares/rateLimiter';

const adminRouter: Router = express.Router();

/**
 * @swagger
 * /api/v1/admins/register:
 *   post:
 *     summary: Register a new admin
 *     tags: [Admin]
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
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *                 description: Must be at least 8 characters with uppercase, lowercase, number, and special character
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         description: Too many registration attempts
 */
adminRouter.post('/register', registerLimiter, validate(registerAdmin), registerAdminCtrl);

/**
 * @swagger
 * /api/v1/admins/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
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
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
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
 *                   example: success
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token
 *                     role:
 *                       type: string
 *                       enum: [admin]
 *       400:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */

adminRouter.post('/login', authLimiter, validate(login), loginAdminCtrl);

/**
 * @swagger
 * /api/v1/admins:
 *   get:
 *     summary: Get all admins
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: -createdAt
 *     responses:
 *       200:
 *         description: List of admins retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
adminRouter.get(
  '/',
  isAuthenticated(),
  roleRestriction('admin'),
  advancedResults(Admin),
  getAdminsCtrl
);

/**
 * @swagger
 * /api/v1/admins/profile:
 *   get:
 *     summary: Get admin profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
adminRouter.get('/profile', isAuthenticated(), roleRestriction('admin'), getAdminProfileCtrl);

/**
 * @swagger
 * /api/v1/admins:
 *   put:
 *     summary: Update admin profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
adminRouter.put(
  '/',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  validate(updateAdminProfile),
  updateAdminCtrl
);

/**
 * @swagger
 * /api/v1/admins/suspend/staff/{id}:
 *   put:
 *     summary: Suspend a staff member
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff member suspended successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put(
  '/suspend/staff/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  adminSuspendTeacherCtrl
);

/**
 * @swagger
 * /api/v1/admins/unsuspend/staff/{id}:
 *   put:
 *     summary: Unsuspend a staff member
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff member unsuspended successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put(
  '/unsuspend/staff/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  adminUnsuspendteacherCtrl
);

/**
 * @swagger
 * /api/v1/admins/withdraw/staff/{id}:
 *   put:
 *     summary: Withdraw a staff member
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff member withdrawn successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put(
  '/withdraw/staff/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  adminWithdrawTeacherCtrl
);

/**
 * @swagger
 * /api/v1/admins/unwithdraw/staff/{id}:
 *   put:
 *     summary: Unwithdraw a staff member
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff member unwithdrawn successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put(
  '/unwithdraw/staff/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  adminUnwithdrawTeacherCtrl
);

adminRouter.put(
  '/suspend/student/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  adminSuspendStudentCtrl
);

adminRouter.put(
  '/unsuspend/student/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  adminUnsuspendStudentCtrl
);

adminRouter.put(
  '/withdraw/student/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  adminWithdrawStudentCtrl
);

adminRouter.put(
  '/unwithdraw/student/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  adminUnwithdrawStudentCtrl
);

/**
 * @swagger
 * /api/v1/admins/publish/exam/{id}:
 *   put:
 *     summary: Publish exam results
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam results published successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put(
  '/publish/exam/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  validate(idParam),
  adminPublishResultsCtrl
);

/**
 * @swagger
 * /api/v1/admins/unpublish/exam/{id}:
 *   put:
 *     summary: Unpublish exam results
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam results unpublished successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put(
  '/unpublish/exam/:id',
  isAuthenticated(),
  roleRestriction('admin'),
  validate(idParam),
  adminUnpublishResultsCtrl
);

export default adminRouter;
