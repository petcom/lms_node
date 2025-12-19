const express = require("express");
const { createProgram, getPrograms, getSingleProgram, updateProgram, deleteProgram } = require("../../controller/academics/programsCtrl");
const advancedResults = require("../../middlewares/advancedResults");
const Program = require("../../model/Academic/Program");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");

const programRouter = express.Router();

/**
 * updated chained routes
 */
programRouter
  .route("/")
  .post(isAuthenticated(), roleRestriction("admin"), createProgram)
  .get(isAuthenticated(), roleRestriction("admin"), advancedResults(Program), getPrograms);

programRouter
  .route("/:id")
  .get(isAuthenticated(), roleRestriction("admin"), getSingleProgram)
  .put(isAuthenticated(), roleRestriction("admin"), updateProgram)
  .delete(isAuthenticated(), roleRestriction("admin"), deleteProgram);

module.exports = programRouter;
