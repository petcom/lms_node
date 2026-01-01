import express, { Router } from 'express';
import { logout, logoutAll, refreshToken, getTokenInfo } from '../../controller/auth/authCtrl';
import isAuthenticated from '../../middlewares/isAuthenticated';
import validate from '../../middlewares/validate';
import { refreshToken as refreshTokenValidation } from '../../validators/authValidation';

const authRouter: Router = express.Router();

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
authRouter.post('/refresh', validate(refreshTokenValidation), refreshToken);

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
authRouter.post('/logout', isAuthenticated(), logout);

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
authRouter.post('/logout-all', isAuthenticated(), logoutAll);

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
 *                     userId:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [global-admin, staff, learner]
 *                     issuedAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                     timeRemaining:
 *                       type: number
 *                       description: Seconds until expiry
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
authRouter.get('/token-info', isAuthenticated(), getTokenInfo);

export default authRouter;
