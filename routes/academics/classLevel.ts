import express, { Router } from "express";
import { createClassLevel, getClassLevel, getClassLevels, updateClassLevel, deleteClassLevel } from "../../controller/academics/classLevelCtrl";
import advancedResults from "../../middlewares/advancedResults";
import AcademicTerm from "../../model/Academic/AcademicTerm";
import isAuthenticated from "../../middlewares/isAuthenticated";
import roleRestriction from "../../middlewares/roleRestriction";

const classLevelRouter: Router = express.Router();

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

export default classLevelRouter;
