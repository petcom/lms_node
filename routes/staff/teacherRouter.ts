import express, { Router } from "express";

import {
  adminRegisterTeacher,
  loginTeacher,
  getAllTeachersAdmin,
  getTeacherByAdmin,
  getTeacherProfile,
  teacherUpdateProfile,
  adminUpdateTeacher,
} from "../../controller/staff/teachersCtrl";
import advancedResults from "../../middlewares/advancedResults";
import Teacher from "../../model/Staff/Teacher";
import isAuthenticated from "../../middlewares/isAuthenticated";
import roleRestriction from "../../middlewares/roleRestriction";

const teachersRouter: Router = express.Router();

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
  "/admin/register",
  isAuthenticated(),
  roleRestriction("admin"),
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
 *       400:
 *         description: Invalid credentials
 */
teachersRouter.post("/login", loginTeacher);

teachersRouter.get(
  "/admin",
  isAuthenticated(),
  roleRestriction("admin"),
  advancedResults(Teacher, {
    path: "examsCreated",
    populate: {
      path: "questions", // inside exam created, we want to populate questions
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
teachersRouter.get(
  "/profile",
  isAuthenticated(),
  roleRestriction("teacher"),
  getTeacherProfile
);

teachersRouter.get(
  "/:teacherID/admin",
  isAuthenticated(),
  roleRestriction("admin"),
  getTeacherByAdmin
);
teachersRouter.put(
  "/:teacherID/update",
  isAuthenticated(),
  roleRestriction("teacher"),
  teacherUpdateProfile
);
teachersRouter.put(
  "/:teacherID/update/admin",
  isAuthenticated(),
  roleRestriction("admin"),
  adminUpdateTeacher
);

export default teachersRouter;
