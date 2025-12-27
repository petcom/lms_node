import express, { Router } from "express";
import { createProgram, getPrograms, getSingleProgram, updateProgram, deleteProgram } from "../../controller/academics/programsCtrl";
import advancedResults from "../../middlewares/advancedResults";
import Program from "../../model/Academic/Program";
import isAuthenticated from "../../middlewares/isAuthenticated";
import roleRestriction, { isTeacherOrAdmin } from "../../middlewares/roleRestriction";
import departmentScope from "../../middlewares/departmentScope";

const programRouter: Router = express.Router();

/**
 * updated chained routes
 */
programRouter
  .route("/")
  .post(isAuthenticated(), roleRestriction("admin"), createProgram)
  .get(
    isAuthenticated(),
    departmentScope(),
    isTeacherOrAdmin,
    advancedResults(Program, undefined, (req) => {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      if (scope && scope !== 'all') {
        return { department: { $in: scope } } as any;
      }
      return {} as any;
    }),
    getPrograms
  );

programRouter
  .route("/:id")
  .get(isAuthenticated(), departmentScope(), isTeacherOrAdmin, getSingleProgram)
  .put(isAuthenticated(), roleRestriction("admin"), updateProgram)
  .delete(isAuthenticated(), roleRestriction("admin"), deleteProgram);

export default programRouter;
