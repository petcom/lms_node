import express, { Router } from "express";
import { createClassLevel, getClassLevel, getClassLevels, updateClassLevel, deleteClassLevel } from "../../controller/academics/classLevelCtrl";
import advancedResults from "../../middlewares/advancedResults";
import AcademicTerm from "../../model/Academic/AcademicTerm";
import isAuthenticated from "../../middlewares/isAuthenticated";
import roleRestriction, { isTeacherOrAdmin } from "../../middlewares/roleRestriction";
import departmentScope from "../../middlewares/departmentScope";

const classLevelRouter: Router = express.Router();

/**
 * updated chained routes
 */
classLevelRouter
  .route("/")
  .post(isAuthenticated(), roleRestriction("admin"), createClassLevel)
  .get(
    isAuthenticated(),
    departmentScope(),
    isTeacherOrAdmin,
    advancedResults(AcademicTerm, undefined, (req) => {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      if (scope && scope !== 'all') {
        return { department: { $in: scope } } as any;
      }
      return {} as any;
    }),
    getClassLevels
  );

classLevelRouter
  .route("/:id")
  .get(isAuthenticated(), departmentScope(), isTeacherOrAdmin, getClassLevel)
  .put(isAuthenticated(), roleRestriction("admin"), updateClassLevel)
  .delete(isAuthenticated(), roleRestriction("admin"), deleteClassLevel);

export default classLevelRouter;
