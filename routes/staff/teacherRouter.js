const express = require("express");

const {
  adminRegisterTeacher,
  loginTeacher,
  getAllTeachersAdmin,
  getTeacherByAdmin,
  getTeacherProfile,
  teacherUpdateProfile,
  adminUpdateTeacher,
} = require("../../controller/staff/teachersCtrl");
const advancedResults = require("../../middlewares/advancedResults");
const Teacher = require("../../model/Staff/Teacher");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const Admin = require("../../model/Staff/Admin");
const roleRestriction = require("../../middlewares/roleRestriction");
const teachersRouter = express.Router();

teachersRouter.post(
  "/admin/register",
  isAuthenticated(),
  roleRestriction("admin"),
  adminRegisterTeacher
);
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

module.exports = teachersRouter;
