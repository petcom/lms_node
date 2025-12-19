const express = require("express");
const {
  checkExamResults,
  getExamResults,
  adminToggleExamResult,
} = require("../../controller/academics/examResults");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");

const examResultRouter = express.Router();

examResultRouter.get("/:id/check", isAuthenticated(), roleRestriction("student"), checkExamResults);
examResultRouter.get("/", isAuthenticated(), roleRestriction("student"), getExamResults);

examResultRouter.put(
  "/:id/admin-toggle-publish",
  isAuthenticated(),
  roleRestriction("admin"),
  adminToggleExamResult
);

module.exports = examResultRouter;
