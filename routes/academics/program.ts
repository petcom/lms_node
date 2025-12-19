import express, { Router } from "express";
import { createProgram, getPrograms, getSingleProgram, updateProgram, deleteProgram } from "../../controller/academics/programsCtrl";
import advancedResults from "../../middlewares/advancedResults";
import Program from "../../model/Academic/Program";
import isAuthenticated from "../../middlewares/isAuthenticated";
import roleRestriction from "../../middlewares/roleRestriction";

const programRouter: Router = express.Router();

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

export default programRouter;
