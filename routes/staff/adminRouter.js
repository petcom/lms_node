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

/**
 * Login
 */
adminRouter.post("/login", authLimiter, validate(authValidation.login), loginAdminCtrl);

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
