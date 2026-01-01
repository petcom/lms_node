/**
 * SCORM API Swagger Documentation
 * Comprehensive OpenAPI/Swagger documentation for all SCORM endpoints
 */

/**
 * @swagger
 * /api/v1/scorm/packages:
 *   post:
 *     summary: Upload a new SCORM package
 *     tags: [SCORM - Packages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - title
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: SCORM package ZIP file
 *               title:
 *                 type: string
 *                 example: Introduction to JavaScript
 *               description:
 *                 type: string
 *                 example: Learn the fundamentals of JavaScript
 *               subject:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *               isGraded:
 *                 type: boolean
 *                 example: true
 *               passingScore:
 *                 type: number
 *                 example: 70
 *     responses:
 *       201:
 *         description: Package uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ScormPackage'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   get:
 *     summary: Get all SCORM packages
 *     tags: [SCORM - Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by package status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of SCORM packages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScormPackage'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *
 * /api/v1/scorm/packages/{id}:
 *   get:
 *     summary: Get SCORM package by ID
 *     tags: [SCORM - Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Package ID
 *     responses:
 *       200:
 *         description: Package details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ScormPackage'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     summary: Update SCORM package
 *     tags: [SCORM - Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *     responses:
 *       200:
 *         description: Package updated successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Delete SCORM package
 *     tags: [SCORM - Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *
 * /api/v1/scorm/packages/{id}/publish:
 *   post:
 *     summary: Publish SCORM package
 *     tags: [SCORM - Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package published successfully
 *
 * /api/v1/scorm/packages/{id}/students:
 *   post:
 *     summary: Assign students to SCORM package
 *     tags: [SCORM - Packages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               students:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
 *     responses:
 *       200:
 *         description: Students assigned successfully
 *
 * /api/v1/scorm/runtime/{attemptId}/initialize:
 *   post:
 *     summary: Initialize SCORM runtime session
 *     tags: [SCORM - Runtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *         description: Attempt ID
 *     responses:
 *       200:
 *         description: Session initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     initialized:
 *                       type: boolean
 *                       example: true
 *                     errorCode:
 *                       type: string
 *                       example: '0'
 *
 * /api/v1/scorm/runtime/{attemptId}/get/{element}:
 *   get:
 *     summary: Get CMI data element value
 *     tags: [SCORM - Runtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: element
 *         required: true
 *         schema:
 *           type: string
 *         example: cmi.core.score.raw
 *     responses:
 *       200:
 *         description: CMI value retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     element:
 *                       type: string
 *                       example: cmi.core.score.raw
 *                     value:
 *                       type: string
 *                       example: '85'
 *
 * /api/v1/scorm/runtime/{attemptId}/set:
 *   post:
 *     summary: Set CMI data element value
 *     tags: [SCORM - Runtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               element:
 *                 type: string
 *                 example: cmi.core.score.raw
 *               value:
 *                 type: string
 *                 example: '85'
 *     responses:
 *       200:
 *         description: Value set successfully
 *
 * /api/v1/scorm/runtime/{attemptId}/commit:
 *   post:
 *     summary: Commit (save) CMI data to database
 *     tags: [SCORM - Runtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Data committed successfully
 *
 * /api/v1/scorm/runtime/{attemptId}/terminate:
 *   post:
 *     summary: Terminate SCORM session
 *     tags: [SCORM - Runtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session terminated successfully
 *
 * /api/v1/scorm/player/{packageId}/launch:
 *   get:
 *     summary: Launch SCORM content player
 *     tags: [SCORM - Player]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player HTML page
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *
 * /api/v1/scorm/reports/student/{studentId}:
 *   get:
 *     summary: Get student progress across all SCORM packages
 *     tags: [SCORM - Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student progress data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     studentId:
 *                       type: string
 *                     packages:
 *                       type: array
 *                       items:
 *                         type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalPackages:
 *                           type: number
 *                         completedPackages:
 *                           type: number
 *                         averageScore:
 *                           type: number
 *
 * /api/v1/scorm/reports/package/{packageId}/analytics:
 *   get:
 *     summary: Get package analytics (staff/admin)
 *     tags: [SCORM - Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Package analytics data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScormReportAnalytics'
 *
 * /api/v1/scorm/reports/export:
 *   get:
 *     summary: Export SCORM tracking data
 *     tags: [SCORM - Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [json, csv, xlsx]
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Export file download
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           text/csv:
 *             schema:
 *               type: string
 *
 * /api/v1/scorm/attempts:
 *   post:
 *     summary: Create a new SCORM attempt
 *     tags: [SCORM - Attempts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               packageId:
 *                 type: string
 *               studentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Attempt created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ScormAttempt'
 */

export {};
