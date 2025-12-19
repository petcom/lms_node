const express = require("express");
const { createExam, getExams, getExam, updateExam, deleteExam } = require("../../controller/academics/examsCtrl");
const Exam = require("../../model/Academic/Exam");
const advancedResults = require("../../middlewares/advancedResults");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");

const examRouter = express.Router();

examRouter
    .route("/")
    .post(isAuthenticated(), roleRestriction("teacher"), createExam)
    .get(isAuthenticated(), roleRestriction("teacher"), advancedResults(Exam, {
        path: "questions",
        populate: {
            path: "createdBy",
        }
    }), 
    getExams
);
    
examRouter
    .route("/:id")
    .get(isAuthenticated(), roleRestriction("teacher"), getExam)
    .put(isAuthenticated(), roleRestriction("teacher"), updateExam)
    .delete(isAuthenticated(), roleRestriction("teacher"), deleteExam);

module.exports=examRouter;