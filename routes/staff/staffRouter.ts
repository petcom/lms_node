import express, { Router } from 'express';

import {
  adminRegisterStaff,
  loginStaff,
  getAllStaffAdmin,
  getStaffByAdmin,
  getStaffProfile,
  staffUpdateProfile,
  adminUpdateStaff,
} from '../../controller/staff/staffCtrl';
import {
  publishInstructorPackage,
  unpublishInstructorPackage,
  listInstructorPackages,
  assignInstructorPackage,
  listInstructorClasses,
  instructorDashboard,
  listInstructorAttempts,
  listInstructorAssignments,
} from '../../controller/instructors/instructorPackageCtrl';
import advancedResults from '../../middlewares/advancedResults';
import Staff from '../../model/Staff/Staff';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';

const staffRouter: Router = express.Router();

// Staff SCORM package controls (phase 1)
staffRouter.post(
  '/packages/:id/publish',
  isAuthenticated(),
  roleRestriction('staff', 'global-admin'),
  publishInstructorPackage
);

staffRouter.post(
  '/packages/:id/unpublish',
  isAuthenticated(),
  roleRestriction('staff', 'global-admin'),
  unpublishInstructorPackage
);

staffRouter.get(
  '/packages',
  isAuthenticated(),
  roleRestriction('staff', 'global-admin'),
  listInstructorPackages
);

staffRouter.post(
  '/assignments/assign',
  isAuthenticated(),
  roleRestriction('staff', 'global-admin'),
  assignInstructorPackage
);

staffRouter.get(
  '/classes',
  isAuthenticated(),
  roleRestriction('staff', 'global-admin'),
  listInstructorClasses
);

staffRouter.get(
  '/dashboard',
  isAuthenticated(),
  roleRestriction('staff', 'global-admin'),
  instructorDashboard
);

staffRouter.get(
  '/attempts',
  isAuthenticated(),
  roleRestriction('staff', 'global-admin'),
  listInstructorAttempts
);

staffRouter.get(
  '/assignments',
  isAuthenticated(),
  roleRestriction('staff', 'global-admin'),
  listInstructorAssignments
);

/**
 * @swagger
 * /api/v1/staff/admins/staff/register:
 *   post:
 *     summary: Admin registers a new staff member
 *     tags: [Staff]
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
 *                 format: password
 *     responses:
 *       201:
 *         description: Staff registered successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
staffRouter.post(
  '/admins/staff/register',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  adminRegisterStaff
);

/**
 * @swagger
 * /api/v1/staff/login:
 *   post:
 *     summary: Staff login
 *     tags: [Staff]
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [staff]
 *       400:
 *         description: Invalid credentials
 */
staffRouter.post('/login', loginStaff);

staffRouter.get(
  '/admins/staff',
  isAuthenticated(),
  roleRestriction('global-admin'),
  advancedResults(Staff, {
    path: 'examsCreated',
    populate: {
      path: 'questions', // inside exam created, we want to populate questions
    },
  }), // model first, then data IDs you want populate
  getAllStaffAdmin
);

/**
 * @swagger
 * /api/v1/staff/profile:
 *   get:
 *     summary: Get staff profile
 *     tags: [Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Staff profile retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
staffRouter.get('/profile', isAuthenticated(), roleRestriction('staff'), getStaffProfile);

staffRouter.get(
  '/admins/staff/:staffID',
  isAuthenticated(),
  roleRestriction('global-admin'),
  getStaffByAdmin
);
staffRouter.put(
  '/:staffID/update',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('staff'),
  staffUpdateProfile
);
staffRouter.put(
  '/admins/staff/:staffID/update',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('global-admin'),
  adminUpdateStaff
);

export default staffRouter;
