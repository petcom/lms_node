const express = require("express");
const {
    changePassword,
    forgotPassword,
    resetPassword,
    validatePasswordStrength
} = require("../../controller/auth/passwordCtrl");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const Admin = require("../../model/Staff/Admin");

const passwordRouter = express.Router();

// Public routes
passwordRouter.post("/forgot", forgotPassword);
passwordRouter.put("/reset/:token", resetPassword);
passwordRouter.post("/validate", validatePasswordStrength);

// Protected routes (require authentication)
passwordRouter.put("/change", isAuthenticated(Admin), changePassword);

module.exports = passwordRouter;
