const express = require("express");
const { createYearGroup, getYearGroups, getYearGroup, updateYearGroup, deleteYearGroup } = require("../../controller/academics/yearGroupsCtrl");
const advancedResults = require("../../middlewares/advancedResults");
const YearGroup = require("../../model/Academic/YearGroup");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");

const yearGroupRouter = express.Router();

/**
 * updated chained routes
 */
yearGroupRouter
  .route('/')
  .post(isAuthenticated(), roleRestriction("admin"), createYearGroup)
  .get(isAuthenticated(), roleRestriction("admin"), advancedResults(YearGroup), getYearGroups);


yearGroupRouter
  .route("/:id")
  .get(isAuthenticated(), roleRestriction("admin"), getYearGroup)
  .put(isAuthenticated(), roleRestriction("admin"), updateYearGroup)
  .delete(isAuthenticated(), roleRestriction("admin"), deleteYearGroup);

module.exports = yearGroupRouter;
