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

studentRouter.post(
  "/admin/register",
  isAuthenticated(),
  roleRestriction("admin"),
  adminRegisterStudent
);
studentRouter.post("/login", loginStudent);
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
