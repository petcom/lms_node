const express = require("express");
const { createQuestion, getQuestions, getQuestion, updateQuestion } = require("../../controller/academics/questionsCtrl");
const advancedResults = require("../../middlewares/advancedResults");
const Question = require("../../model/Academic/Questions");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");

const questionsRouter = express.Router();

questionsRouter.get('/', isAuthenticated(), roleRestriction("teacher"), advancedResults(Question), getQuestions);
questionsRouter.get('/:id', isAuthenticated(), roleRestriction("teacher"), getQuestion);
questionsRouter.post('/:examID', isAuthenticated(), roleRestriction("teacher"), createQuestion);
questionsRouter.put('/:id', isAuthenticated(), roleRestriction("teacher"), updateQuestion);


module.exports = questionsRouter;