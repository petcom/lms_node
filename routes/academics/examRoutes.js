const express = require("express");
const { createExam, getExams, getExam, updateExam, deleteExam } = require("../../controller/academics/examsCtrl");
const Exam = require("../../model/Academic/Exam");
const advancedResults = require("../../middlewares/advancedResults");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const roleRestriction = require("../../middlewares/roleRestriction");

const examRouter = express.Router();

/**
 * @swagger
 * /api/v1/exams:
 *   post:
 *     summary: Create a new exam
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - subject
 *               - program
 *               - duration
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               subject:
 *                 type: string
 *               program:
 *                 type: string
 *               duration:
 *                 type: number
 *     responses:
 *       201:
 *         description: Exam created successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   get:
 *     summary: Get all exams
 *     tags: [Exams]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of exams
 */
examRouter
    .route("/")
    .post(isAuthenticated(), roleRestriction("teacher"), createExam)
    .get(isAuthenticated(), roleRestriction("teacher"), advancedResults(Exam, {
        path: "questions",
        populate: {
            path: "createdBy",
        }
    }), 
    getExams
);
    
/**
 * @swagger
 * /api/v1/exams/{id}:
 *   get:
 *     summary: Get exam by ID
 *     tags: [Exams]
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
 *         description: Exam details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     summary: Update exam
 *     tags: [Exams]
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
 *         description: Exam updated successfully
 *   delete:
 *     summary: Delete exam
 *     tags: [Exams]
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
 *         description: Exam deleted successfully
 */
examRouter
    .route("/:id")
    .get(isAuthenticated(), roleRestriction("teacher"), getExam)
    .put(isAuthenticated(), roleRestriction("teacher"), updateExam)
    .delete(isAuthenticated(), roleRestriction("teacher"), deleteExam);

module.exports=examRouter;