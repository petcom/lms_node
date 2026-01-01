import express, { Router } from 'express';
import {
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
} from '../../controller/academics/examsCtrl';
import Exam from '../../model/Academic/Exam';
import advancedResults from '../../middlewares/advancedResults';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';

const examRouter: Router = express.Router();

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
  .route('/')
  .post(isAuthenticated(), roleRestriction('staff'), createExam)
  .get(
    isAuthenticated(),
    roleRestriction('staff'),
    advancedResults(Exam, {
      path: 'questions',
      populate: {
        path: 'createdBy',
      },
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
  .route('/:id')
  .get(isAuthenticated(), roleRestriction('staff'), getExam)
  .put(isAuthenticated(), roleRestriction('staff'), updateExam)
  .delete(isAuthenticated(), roleRestriction('staff'), deleteExam);

export default examRouter;
