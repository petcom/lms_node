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
const { registerLimiter, authLimiter } = require("../../middlewares/rateLimiter");
const adminRouter = express.Router();

/**
 * @swagger
 * /api/v1/admins/register:
 *   post:
 *     summary: Register a new admin
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin@123
 *                 description: Must be at least 8 characters with uppercase, lowercase, number, and special character
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         description: Too many registration attempts
 */
adminRouter.post("/register", registerLimiter, validate(authValidation.registerAdmin), registerAdminCtrl);

/**
 * @swagger
 * /api/v1/admins/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT access token
 *       400:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */

adminRouter.post("/login", authLimiter, validate(authValidation.login), loginAdminCtrl);

/**
 * @swagger
 * /api/v1/admins:
 *   get:
 *     summary: Get all admins
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: -createdAt
 *     responses:
 *       200:
 *         description: List of admins retrieved successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
adminRouter.get(
  "/",
  isAuthenticated(),
  roleRestriction("admin"),
  advancedResults(Admin),
  getAdminsCtrl
);

/**
 * @swagger
 * /api/v1/admins/profile:
 *   get:
 *     summary: Get admin profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
adminRouter.get(
  "/profile",
  isAuthenticated(),
  roleRestriction("admin"),
  getAdminProfileCtrl
);

/**
 * @swagger
 * /api/v1/admins:
 *   put:
 *     summary: Update admin profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
adminRouter.put(
  "/",
  isAuthenticated(),
  roleRestriction("admin"),
  validate(staffValidation.updateAdminProfile),
  updateAdminCtrl
);


/**
 * @swagger
 * /api/v1/admins/suspend/teacher/{id}:
 *   put:
 *     summary: Suspend a teacher
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher suspended successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put("/suspend/teacher/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(staffValidation.staffAction), 
  adminSuspendTeacherCtrl
);

/**
 * @swagger
 * /api/v1/admins/unsuspend/teacher/{id}:
 *   put:
 *     summary: Unsuspend a teacher
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher unsuspended successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put("/unsuspend/teacher/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(staffValidation.staffAction), 
  adminUnsuspendteacherCtrl
);

/**
 * @swagger
 * /api/v1/admins/withdraw/teacher/{id}:
 *   put:
 *     summary: Withdraw a teacher
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher withdrawn successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put("/withdraw/teacher/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(staffValidation.staffAction), 
  adminWithdrawTeacherCtrl
);

/**
 * @swagger
 * /api/v1/admins/unwithdraw/teacher/{id}:
 *   put:
 *     summary: Unwithdraw a teacher
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID
 *     responses:
 *       200:
 *         description: Teacher unwithdrawn successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put("/unwithdraw/teacher/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(staffValidation.staffAction), 
  adminUnwithdrawTeacherCtrl
);

/**
 * @swagger
 * /api/v1/admins/publish/exam/{id}:
 *   put:
 *     summary: Publish exam results
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam results published successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put("/publish/exam/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(idParam), 
  adminPublishResultsCtrl
);

/**
 * @swagger
 * /api/v1/admins/unpublish/exam/{id}:
 *   put:
 *     summary: Unpublish exam results
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exam ID
 *     responses:
 *       200:
 *         description: Exam results unpublished successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
adminRouter.put("/unpublish/exam/:id", 
  isAuthenticated(),
  roleRestriction("admin"),
  validate(idParam), 
  adminUnpublishResultsCtrl
);

module.exports = adminRouter;
