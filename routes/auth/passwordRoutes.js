const express = require("express");
const {
    changePassword,
    forgotPassword,
    resetPassword,
    validatePasswordStrength
} = require("../../controller/auth/passwordCtrl");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const validate = require("../../middlewares/validate");
const authValidation = require("../../validators/authValidation");
const Admin = require("../../model/Staff/Admin");

const passwordRouter = express.Router();

// Public routes
passwordRouter.post("/forgot", validate(authValidation.forgotPassword), forgotPassword);
passwordRouter.put("/reset/:token", validate(authValidation.resetPassword), resetPassword);
passwordRouter.post("/validate", validate(authValidation.validatePasswordStrength), validatePasswordStrength);

// Protected routes (require authentication)
passwordRouter.put("/change", isAuthenticated(Admin), validate(authValidation.changePassword), changePassword);

module.exports = passwordRouter;
