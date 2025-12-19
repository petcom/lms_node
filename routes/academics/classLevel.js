const express = require("express");
const { createClassLevel, getClassLevel, getClassLevels, updateClassLevel, deleteClassLevel } = require("../../controller/academics/classLevelCtrl");
const advancedResults = require("../../middlewares/advancedResults");
const AcademicTerm = require("../../model/Academic/AcademicTerm");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");

const classLevelRouter = express.Router();

/**
 * updated chained routes
 */
classLevelRouter
  .route("/")
  .post(isAuthenticated(), roleRestriction("admin"), createClassLevel)
  .get(isAuthenticated(), roleRestriction("admin"), advancedResults(AcademicTerm), getClassLevels);

classLevelRouter
  .route("/:id")
  .get(isAuthenticated(), roleRestriction("admin"), getClassLevel)
  .put(isAuthenticated(), roleRestriction("admin"), updateClassLevel)
  .delete(isAuthenticated(), roleRestriction("admin"), deleteClassLevel);

module.exports = classLevelRouter;
