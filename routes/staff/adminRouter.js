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
const validate = require("../../middlewares/validate");
const authValidation = require("../../validators/authValidation");
const staffValidation = require("../../validators/staffValidation");
const { idParam } = require("../../validators/academicValidation");
const adminRouter = express.Router();

/**
 * Register
 */
adminRouter.post("/register", validate(authValidation.registerAdmin), registerAdminCtrl);

/**
 * Login
 */
adminRouter.post("/login", validate(authValidation.login), loginAdminCtrl);

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
  validate(staffValidation.updateAdminProfile),
  updateAdminCtrl
);

/**
 * Suspend Teacher
 */
adminRouter.put("/suspend/teacher/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(staffValidation.staffAction), 
  adminSuspendTeacherCtrl
);

/**
 * Unsuspend Teacher
 */
adminRouter.put("/unsuspend/teacher/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(staffValidation.staffAction), 
  adminUnsuspendteacherCtrl
);

/**
 * Withdrawl Teacher
 */
adminRouter.put("/withdraw/teacher/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(staffValidation.staffAction), 
  adminWithdrawTeacherCtrl
);

/**
 * Unwithdrawl Teacher
 */
adminRouter.put("/unwithdraw/teacher/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(staffValidation.staffAction), 
  adminUnwithdrawTeacherCtrl
);

/**
 * Publish Exam Results
 */
adminRouter.put("/publish/exam/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(idParam), 
  adminPublishResultsCtrl
);

/**
 * Unpublish Exam Results
 */
adminRouter.put("/unpublish/exam/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(idParam), 
  adminUnpublishResultsCtrl
);

module.exports = adminRouter;
