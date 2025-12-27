import express, { Router } from 'express';
import {
  createAcademicYear,
  getAcademicYears,
  getAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
} from '../../controller/academics/academicYearCtrl';
import AcademicYear from '../../model/Academic/AcademicYear';
import advancedResults from '../../middlewares/advancedResults';
import isAuthenticated from '../../middlewares/isAuthenticated';
import roleRestriction from '../../middlewares/roleRestriction';
import validate from '../../middlewares/validate';
import {
  createAcademicYear as createAcademicYearValidation,
  updateAcademicYear as updateAcademicYearValidation,
  idParam,
} from '../../validators/academicValidation';
import { cachePrivate } from '../../middlewares/caching';

const academicYearRouter: Router = express.Router();

/**
 * @swagger
 * /api/v1/academic-years:
 *   post:
 *     summary: Create a new academic year
 *     tags: [Academic Years]
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
 *               - fromYear
 *               - toYear
 *             properties:
 *               name:
 *                 type: string
 *                 example: 2024/2025
 *               fromYear:
 *                 type: string
 *                 format: date
 *                 example: 2024-09-01
 *               toYear:
 *                 type: string
 *                 format: date
 *                 example: 2025-06-30
 *               isCurrent:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Academic year created successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *   get:
 *     summary: Get all academic years
 *     tags: [Academic Years]
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
 *         name: isCurrent
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of academic years
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
academicYearRouter
  .route('/')
  .post(
    isAuthenticated(),
    roleRestriction('admin'),
    validate(createAcademicYearValidation),
    createAcademicYear
  )
  .get(
    isAuthenticated(),
    roleRestriction('admin'),
    cachePrivate(120),
    advancedResults(AcademicYear),
    getAcademicYears
  );

/**
 * @swagger
 * /api/v1/academic-years/{id}:
 *   get:
 *     summary: Get academic year by ID
 *     tags: [Academic Years]
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
 *         description: Academic year details
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     summary: Update academic year
 *     tags: [Academic Years]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               name:
 *                 type: string
 *               fromYear:
 *                 type: string
 *                 format: date
 *               toYear:
 *                 type: string
 *                 format: date
 *               isCurrent:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Academic year updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   delete:
 *     summary: Delete academic year
 *     tags: [Academic Years]
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
 *         description: Academic year deleted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
academicYearRouter
  .route('/:id')
  .get(
    isAuthenticated(),
    roleRestriction('admin'),
    cachePrivate(120),
    validate(idParam),
    getAcademicYear
  )
  .put(
    isAuthenticated(),
    roleRestriction('admin'),
    validate(updateAcademicYearValidation),
    updateAcademicYear
  )
  .delete(isAuthenticated(), roleRestriction('admin'), validate(idParam), deleteAcademicYear);

export default academicYearRouter;
