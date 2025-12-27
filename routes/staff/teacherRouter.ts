import express, { Router } from 'express';

import {
  adminRegisterTeacher,
  loginTeacher,
  getAllTeachersAdmin,
  getTeacherByAdmin,
  getTeacherProfile,
  teacherUpdateProfile,
  adminUpdateTeacher,
} from '../../controller/staff/teachersCtrl';
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
import Teacher from '../../model/Staff/Teacher';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';

const teachersRouter: Router = express.Router();

// Teacher SCORM package controls (phase 1)
teachersRouter.post(
  '/packages/:id/publish',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  publishTeacherPackage
);

teachersRouter.post(
  '/packages/:id/unpublish',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  unpublishTeacherPackage
);

teachersRouter.get(
  '/packages',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  listTeacherPackages
);

teachersRouter.post(
  '/assignments/assign',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  assignTeacherPackage
);

teachersRouter.get(
  '/classes',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  listTeacherClasses
);

teachersRouter.get(
  '/dashboard',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  teacherDashboard
);

teachersRouter.get(
  '/attempts',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  listTeacherAttempts
);

teachersRouter.get(
  '/assignments',
  isAuthenticated(),
  roleRestriction('teacher', 'admin'),
  listTeacherAssignments
);

/**
 * @swagger
 * /api/v1/teachers/admin/register:
 *   post:
 *     summary: Admin registers a new teacher
 *     tags: [Teachers]
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
 *         description: Teacher registered successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
teachersRouter.post(
  '/admin/register',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  adminRegisterTeacher
);

/**
 * @swagger
 * /api/v1/teachers/login:
 *   post:
 *     summary: Teacher login
 *     tags: [Teachers]
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
teachersRouter.post('/login', loginTeacher);

teachersRouter.get(
  '/admin',
  isAuthenticated(),
  roleRestriction('admin'),
  advancedResults(Teacher, {
    path: 'examsCreated',
    populate: {
      path: 'questions', // inside exam created, we want to populate questions
    },
  }), // model first, then data IDs you want populate
  getAllTeachersAdmin
);

/**
 * @swagger
 * /api/v1/teachers/profile:
 *   get:
 *     summary: Get teacher profile
 *     tags: [Teachers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher profile retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
teachersRouter.get('/profile', isAuthenticated(), roleRestriction('teacher'), getTeacherProfile);

teachersRouter.get(
  '/:teacherID/admin',
  isAuthenticated(),
  roleRestriction('admin'),
  getTeacherByAdmin
);
teachersRouter.put(
  '/:teacherID/update',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('teacher'),
  teacherUpdateProfile
);
teachersRouter.put(
  '/:teacherID/update/admin',
  isAuthenticated(),
  departmentScope(),
  roleRestriction('admin'),
  adminUpdateTeacher
);

export default teachersRouter;
