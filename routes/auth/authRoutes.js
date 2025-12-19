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

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
authRouter.post("/refresh", validate(authValidation.refreshToken), refreshToken);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
authRouter.post("/logout", isAuthenticated(Admin), logout);

/**
 * @swagger
 * /api/v1/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
authRouter.post("/logout-all", isAuthenticated(Admin), logoutAll);

/**
 * @swagger
 * /api/v1/auth/token-info:
 *   get:
 *     summary: Get current token information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token information retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
authRouter.get("/token-info", isAuthenticated(Admin), getTokenInfo);

module.exports = authRouter;
