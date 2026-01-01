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
  publishTeacherPackage,
  unpublishTeacherPackage,
  listTeacherPackages,
  assignTeacherPackage,
  listTeacherClasses,
  teacherDashboard,
  listTeacherAttempts,
  listTeacherAssignments,
} from '../../controller/teachers/teacherPackageCtrl';
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
  roleRestriction('teacher', 'admin'),
  publishTeacherPackage
);

staffRouter.post(
  '/packages/:id/unpublish',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  unpublishTeacherPackage
);

staffRouter.get(
  '/packages',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  listTeacherPackages
);

staffRouter.post(
  '/assignments/assign',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  assignTeacherPackage
);

staffRouter.get(
  '/classes',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  listTeacherClasses
);

staffRouter.get(
  '/dashboard',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  teacherDashboard
);

staffRouter.get(
  '/attempts',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  listTeacherAttempts
);

staffRouter.get(
  '/assignments',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  listTeacherAssignments
);

/**
 * @swagger
 * /api/v1/staff/admin/register:
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
  '/admin/register',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
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
 *                       enum: [teacher]
 *       400:
 *         description: Invalid credentials
 */
staffRouter.post('/login', loginStaff);

staffRouter.get(
  '/admin',
  isAuthenticated(),
  roleRestriction('admin'),
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
staffRouter.get('/profile', isAuthenticated(), roleRestriction('teacher'), getStaffProfile);

staffRouter.get(
  '/:staffID/admin',
  isAuthenticated(),
  roleRestriction('admin'),
  getStaffByAdmin
);
staffRouter.put(
  '/:staffID/update',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('teacher'),
  staffUpdateProfile
);
staffRouter.put(
  '/:staffID/update/admin',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  adminUpdateStaff
);

export default staffRouter;
