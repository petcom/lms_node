const express = require("express");
const { createSubject, getSubjects, getSubject, updateSubject, deleteSubject } = require("../../controller/academics/subjectCtrl");
const advancedResults = require("../../middlewares/advancedResults");
const Subject = require("../../model/Academic/Subject");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");

const subjectRouter = express.Router();

/**
 * updated chained routes
 */
subjectRouter.post('/:programID', isAuthenticated(), roleRestriction("admin"), createSubject);
subjectRouter.get('/', isAuthenticated(), roleRestriction("admin"), advancedResults(Subject), getSubjects);
subjectRouter.get('/:id', isAuthenticated(), roleRestriction("admin"), getSubject);
subjectRouter.put('/:id', isAuthenticated(), roleRestriction("admin"), updateSubject);
subjectRouter.delete('/:id', isAuthenticated(), roleRestriction("admin"), deleteSubject);

module.exports = subjectRouter;
