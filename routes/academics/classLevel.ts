import express, { Router } from "express";
import mongoose from 'mongoose';
import { createClassLevel, getClassLevel, getClassLevels, updateClassLevel, deleteClassLevel } from "../../controller/academics/classLevelCtrl";
import advancedResults from "../../middlewares/advancedResults";
import ClassLevel from "../../model/Academic/ClassLevel";
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
    advancedResults(ClassLevel, undefined, (req) => {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      const requestedDept = typeof req.query.department === 'string' ? req.query.department : undefined;

      if (scope === 'all' && requestedDept && mongoose.isValidObjectId(requestedDept)) {
        return { department: new mongoose.Types.ObjectId(requestedDept) } as any;
      }

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
