const express = require("express");
const {
  createAcademicTerm,
  getAcademicTerm,
  deleteAcademicTerm,
  getAcademicTerms,
  updateAcademicTerms,
} = require("../../controller/academics/academicTermCtrl");
const advancedResults = require("../../middlewares/advancedResults");
const AcademicTerm = require("../../model/Academic/AcademicTerm");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const Admin = require("../../model/Staff/Admin");
const roleRestriction = require("../../middlewares/roleRestriction");

const academicTermRouter = express.Router();

/**
 * updated chained routes
 */
academicTermRouter
  .route("/")
  .post(isAuthenticated(), roleRestriction("admin"), createAcademicTerm)
  .get(isAuthenticated(), roleRestriction("admin"), advancedResults(AcademicTerm), getAcademicTerms);

academicTermRouter
  .route("/:id")
  .get(isAuthenticated(), roleRestriction("admin"), getAcademicTerm)
  .put(isAuthenticated(), roleRestriction("admin"), updateAcademicTerms)
  .delete(isAuthenticated(), roleRestriction("admin"), deleteAcademicTerm);

module.exports = academicTermRouter;
