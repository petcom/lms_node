import express, { Router } from "express";
import { createSubject, getSubjects, getSubject, updateSubject, deleteSubject } from "../../controller/academics/subjectCtrl";
import advancedResults from "../../middlewares/advancedResults";
import Subject from "../../model/Academic/Subject";
import isAuthenticated from "../../middlewares/isAuthenticated";
import roleRestriction from "../../middlewares/roleRestriction";

const subjectRouter: Router = express.Router();

/**
 * updated chained routes
 */
subjectRouter.post('/:programID', isAuthenticated(), roleRestriction("admin"), createSubject);
subjectRouter.get('/', isAuthenticated(), roleRestriction("admin"), advancedResults(Subject), getSubjects);
subjectRouter.get('/:id', isAuthenticated(), roleRestriction("admin"), getSubject);
subjectRouter.put('/:id', isAuthenticated(), roleRestriction("admin"), updateSubject);
subjectRouter.delete('/:id', isAuthenticated(), roleRestriction("admin"), deleteSubject);

export default subjectRouter;
