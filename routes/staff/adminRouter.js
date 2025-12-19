const express = require("express");
const {
  registerAdminCtrl,
  loginAdminCtrl,
  getAdminsCtrl,
  getAdminProfileCtrl,
  updateAdminCtrl,
  adminSuspendTeacherCtrl,
  adminUnsuspendteacherCtrl,
  adminWithdrawTeacherCtrl,
  adminUnwithdrawTeacherCtrl,
  adminPublishResultsCtrl,
  adminUnpublishResultsCtrl,
} = require("../../controller/staff/adminCtrl");

const Admin = require("../../model/Staff/Admin");
const advancedResults = require("../../middlewares/advancedResults");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");
const adminRouter = express.Router();

/**
 * Register
 */
adminRouter.post("/register", registerAdminCtrl);

/**
 * Login
 */
adminRouter.post("/login", loginAdminCtrl);

/**
 * Get All Admin
 */
adminRouter.get(
  "/",
  isAuthenticated(),
  roleRestriction("admin"),
  advancedResults(Admin),
  getAdminsCtrl
);

/**
 * Single Admin
 */
adminRouter.get(
  "/profile",
  isAuthenticated(),
  roleRestriction("admin"),
  getAdminProfileCtrl
);

/**
 * Update Admin
 */
adminRouter.put(
  "/",
  isAuthenticated(),
  roleRestriction("admin"),
  updateAdminCtrl
);

/**
 * Suspend Teacher
 */
adminRouter.put("/suspend/teacher/:id", adminSuspendTeacherCtrl);

/**
 * Unsuspend Teacher
 */
adminRouter.put("/unsuspend/teacher/:id", adminUnsuspendteacherCtrl);

/**
 * Withdrawl Teacher
 */
adminRouter.put("/withdraw/teacher/:id", adminWithdrawTeacherCtrl);

/**
 * Unwithdrawl Teacher
 */
adminRouter.put("/unwithdraw/teacher/:id", adminUnwithdrawTeacherCtrl);

/**
 * Publish Exam Results
 */
adminRouter.put("/publish/exam/:id", adminPublishResultsCtrl);

/**
 * Unpublish Exam Results
 */
adminRouter.put("/unpublish/exam/:id", adminUnpublishResultsCtrl);

module.exports = adminRouter;
