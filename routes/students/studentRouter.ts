import express, { Router } from "express";
import {
  adminRegisterStudent,
  loginStudent,
  getStudentProfile,
  getAllStudentsByAdmin,
  getStudentByAdmin,
  studentUpdateProfile,
  adminUpdateStudent,
  writeExam,
} from "../../controller/students/studentsCtrl";
import advancedResults from "../../middlewares/advancedResults";
import Student from "../../model/Academic/Student";
import isAuthenticated from "../../middlewares/isAuthenticated";
import roleRestriction from "../../middlewares/roleRestriction";

const studentRouter: Router = express.Router();

/**
 * @swagger
 * /api/v1/students/admin/register:
 *   post:
 *     summary: Admin registers a new student
 *     tags: [Students]
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
 *         description: Student registered successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
studentRouter.post(
  "/admin/register",
  isAuthenticated(),
  roleRestriction("admin"),
  adminRegisterStudent
);

/**
 * @swagger
 * /api/v1/students/login:
 *   post:
 *     summary: Student login
 *     tags: [Students]
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
 *                       enum: [student]
 */
studentRouter.post("/login", loginStudent);
/**
 * @swagger
 * /api/v1/students/profile:
 *   get:
 *     summary: Get student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
studentRouter.get(
  "/profile",
  isAuthenticated(),
  roleRestriction("student"),
  getStudentProfile
);
studentRouter.get(
  "/admin",
  isAuthenticated(),
  roleRestriction("admin"),
  advancedResults(Student),
  getAllStudentsByAdmin
);
studentRouter.get(
  "/:studentID/admin",
  isAuthenticated(),
  roleRestriction("admin"),
  getStudentByAdmin
);
/** Students taking exams can access following: */
studentRouter.post(
  "/exams/:examID/write",
  isAuthenticated(),
  roleRestriction("student"),
  writeExam
); // Student only writes exams
/** */
studentRouter.put(
  "/update",
  isAuthenticated(),
  roleRestriction("student"),
  studentUpdateProfile
); // student only
studentRouter.put(
  "/:studentID/update/admin",
  isAuthenticated(),
  roleRestriction("admin"),
  adminUpdateStudent
); // Admin only

export default studentRouter;
