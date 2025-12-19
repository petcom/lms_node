const express = require("express");
const {
  createAcademicYear,
  getAcademicYears,
  getAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
} = require("../../controller/academics/academicYearCtrl");
const { create } = require("../../model/Academic/AcademicYear");
const AcademicYear = require("../../model/Academic/AcademicYear");
const advancedResults = require("../../middlewares/advancedResults");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const Admin = require("../../model/Staff/Admin");
const roleRestriction = require("../../middlewares/roleRestriction");

const academicYearRouter = express.Router();

academicYearRouter
  .route("/")
  .post(isAuthenticated(), roleRestriction("admin"), createAcademicYear)
  .get(
    isAuthenticated(),
    roleRestriction("admin"),
    advancedResults(AcademicYear),
    getAcademicYears
  );

academicYearRouter
  .route("/:id")
  .get(isAuthenticated(), roleRestriction("admin"), getAcademicYear)
  .put(isAuthenticated(), roleRestriction("admin"), updateAcademicYear)
  .delete(isAuthenticated(), roleRestriction("admin"), deleteAcademicYear);

module.exports = academicYearRouter;
