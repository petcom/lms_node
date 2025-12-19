const express = require("express");
const {
  adminRegisterStudent,
  loginStudent,
  getStudentProfile,
  getAllStudentsByAdmin,
  getStudentByAdmin,
  studentUpdateProfile,
  adminUpdateStudent,
  writeExam,
} = require("../../controller/students/studentsCtrl");
const advancedResults = require("../../middlewares/advancedResults");
const Student = require("../../model/Academic/Student");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");
const Admin = require("../../model/Staff/Admin");

const studentRouter = express.Router();

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

module.exports = studentRouter;
