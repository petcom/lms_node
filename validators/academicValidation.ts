/**
 * Academic Validation Schemas
 * Joi validation schemas for academic-related endpoints
 */

import Joi from 'joi';
import { objectId, pagination, academicYear, academicTerm, date } from './common';

/**
 * Academic Year validation
 */
export const createAcademicYear = {
  body: Joi.object({
    name: academicYear.required(),
    fromYear: Joi.date().iso().required(),
    toYear: Joi.date().iso().required().greater(Joi.ref('fromYear')),
  }),
};

export const updateAcademicYear = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: academicYear,
    fromYear: Joi.date().iso(),
    toYear: Joi.date().iso(),
    isCurrent: Joi.boolean(),
  }).min(1),
};

/**
 * Academic Term validation
 */
export const createAcademicTerm = {
  body: Joi.object({
    name: academicTerm.required(),
    description: Joi.string().max(500).trim(),
    duration: Joi.string().trim().required(),
  }),
};

export const updateAcademicTerm = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: academicTerm,
    description: Joi.string().max(500).trim(),
    duration: Joi.string().trim(),
  }).min(1),
};

/**
 * Program validation
 */
export const createProgram = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    description: Joi.string().max(1000).trim().required(),
    duration: Joi.string().trim().required(),
    code: Joi.string().trim().uppercase(),
  }),
};

export const updateProgram = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim(),
    description: Joi.string().max(1000).trim(),
    duration: Joi.string().trim(),
    code: Joi.string().trim().uppercase(),
  }).min(1),
};

/**
 * Program Level validation
 */
export const createProgramLevel = {
  body: Joi.object({
    program: objectId.required(),
    name: Joi.string().min(2).max(100).trim().required(),
    description: Joi.string().max(500).trim(),
    order: Joi.number().integer().min(1).required(),
    department: objectId,
    courses: Joi.array().items(objectId),
  }),
};

export const updateProgramLevel = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim(),
    description: Joi.string().max(500).trim(),
    order: Joi.number().integer().min(1),
    department: objectId.allow(null),
    courses: Joi.array().items(objectId),
  }).min(1),
};

/**
 * Course validation
 */
export const createCourse = {
  body: Joi.object({
    title: Joi.string().min(2).max(200).trim().required(),
    description: Joi.string().max(1000).trim(),
    shortDescription: Joi.string().max(500).trim(),
    longDescription: Joi.string().max(5000).trim(),
    program: objectId.required(),
    programLevel: objectId,
    department: objectId,
    primaryInstructors: Joi.array().items(objectId),
    secondaryInstructors: Joi.array().items(objectId),
  }),
};

export const updateCourse = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    title: Joi.string().min(2).max(200).trim(),
    description: Joi.string().max(1000).trim(),
    shortDescription: Joi.string().max(500).trim(),
    longDescription: Joi.string().max(5000).trim(),
    programLevel: objectId.allow(null),
    department: objectId.allow(null),
    status: Joi.string().valid('draft', 'rendered', 'published'),
    primaryInstructors: Joi.array().items(objectId),
    secondaryInstructors: Joi.array().items(objectId),
  }).min(1),
};

/**
 * Course Content validation
 */
export const createCourseContent = {
  body: Joi.object({
    course: objectId.required(),
    contentType: Joi.string().valid('scorm', 'custom').required(),
    scormPackageId: objectId,
    customContentId: objectId,
    order: Joi.number().integer().min(1),
    isRequired: Joi.boolean(),
    shortDescription: Joi.string().max(500).trim(),
    longDescription: Joi.string().max(5000).trim(),
  }),
};

export const updateCourseContent = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    contentType: Joi.string().valid('scorm', 'custom'),
    scormPackageId: objectId.allow(null),
    customContentId: objectId.allow(null),
    order: Joi.number().integer().min(1),
    isRequired: Joi.boolean(),
    shortDescription: Joi.string().max(500).trim(),
    longDescription: Joi.string().max(5000).trim(),
  }).min(1),
};

/**
 * Enrollment validation
 */
export const createProgramEnrollment = {
  body: Joi.object({
    learner: objectId.required(),
    program: objectId.required(),
    status: Joi.string().valid('active', 'completed', 'withdrawn'),
    enrolledAt: Joi.date().iso(),
  }),
};

export const updateProgramEnrollment = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    status: Joi.string().valid('active', 'completed', 'withdrawn'),
    completedAt: Joi.date().iso(),
    withdrawnAt: Joi.date().iso(),
  }).min(1),
};

export const createClassEnrollment = {
  body: Joi.object({
    learner: objectId.required(),
    classId: objectId.required(),
    enrolledAt: Joi.date().iso(),
  }),
};

export const updateClassEnrollment = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    completedAt: Joi.date().iso(),
    withdrawnAt: Joi.date().iso(),
  }).min(1),
};

export const createCourseEnrollment = {
  body: Joi.object({
    learner: objectId.required(),
    course: objectId.required(),
    classId: objectId,
    status: Joi.string().valid('active', 'completed', 'withdrawn'),
    progress: Joi.number().min(0).max(100),
    startedAt: Joi.date().iso(),
  }),
};

export const updateCourseEnrollment = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    status: Joi.string().valid('active', 'completed', 'withdrawn'),
    progress: Joi.number().min(0).max(100),
    completedAt: Joi.date().iso(),
  }).min(1),
};

/**
 * Year Group validation
 */
export const createYearGroup = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    academicYear: objectId.required(),
  }),
};

export const updateYearGroup = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100).trim(),
    academicYear: objectId,
  }).min(1),
};

/**
 * Exam validation
 */
export const createExam = {
  body: Joi.object({
    name: Joi.string().min(2).max(200).trim().required(),
    description: Joi.string().max(1000).trim(),
    course: objectId.required(),
    program: objectId.required(),
    academicTerm: objectId.required(),
    duration: Joi.number().integer().min(1).max(480).required(), // in minutes, max 8 hours
    examDate: date.required(),
    examTime: Joi.string()
      .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .required(),
    examType: Joi.string().valid('quiz', 'mid-term', 'final', 'assignment').required(),
    passMark: Joi.number().min(0).max(100).required(),
    totalMark: Joi.number().min(1).max(1000).required(),
    programLevel: objectId,
    academicYear: objectId.required(),
  }),
};

export const updateExam = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(200).trim(),
    description: Joi.string().max(1000).trim(),
    course: objectId,
    program: objectId,
    academicTerm: objectId,
    duration: Joi.number().integer().min(1).max(480),
    examDate: date,
    examTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    examType: Joi.string().valid('quiz', 'mid-term', 'final', 'assignment'),
    passMark: Joi.number().min(0).max(100),
    totalMark: Joi.number().min(1).max(1000),
    isPublished: Joi.boolean(),
    programLevel: objectId,
    academicYear: objectId,
  }).min(1),
};

/**
 * Question validation
 */
export const createQuestion = {
  body: Joi.object({
    question: Joi.string().min(5).max(2000).trim().required(),
    optionA: Joi.string().min(1).max(500).trim().required(),
    optionB: Joi.string().min(1).max(500).trim().required(),
    optionC: Joi.string().min(1).max(500).trim().required(),
    optionD: Joi.string().min(1).max(500).trim().required(),
    correctAnswer: Joi.string().valid('A', 'B', 'C', 'D').required(),
    mark: Joi.number().min(0.1).max(100).required(),
    exam: objectId,
  }),
};

export const updateQuestion = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    question: Joi.string().min(5).max(2000).trim(),
    optionA: Joi.string().min(1).max(500).trim(),
    optionB: Joi.string().min(1).max(500).trim(),
    optionC: Joi.string().min(1).max(500).trim(),
    optionD: Joi.string().min(1).max(500).trim(),
    correctAnswer: Joi.string().valid('A', 'B', 'C', 'D'),
    mark: Joi.number().min(0.1).max(100),
  }).min(1),
};

/**
 * Common ID parameter validation
 */
export const idParam = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

/**
 * Pagination query validation
 */
export const paginationQuery = {
  query: Joi.object({
    page: pagination.page,
    limit: pagination.limit,
  }),
};
