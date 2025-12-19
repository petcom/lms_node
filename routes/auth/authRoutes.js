const express = require("express");
const {
    logout,
    logoutAll,
    refreshToken,
    getTokenInfo
} = require("../../controller/auth/authCtrl");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const validate = require("../../middlewares/validate");
const authValidation = require("../../validators/authValidation");
const Admin = require("../../model/Staff/Admin");

const authRouter = express.Router();

// Public routes
authRouter.post("/refresh", validate(authValidation.refreshToken), refreshToken);

// Protected routes (require authentication)
authRouter.post("/logout", isAuthenticated(Admin), logout);
authRouter.post("/logout-all", isAuthenticated(Admin), logoutAll);
authRouter.get("/token-info", isAuthenticated(Admin), getTokenInfo);

module.exports = authRouter;
