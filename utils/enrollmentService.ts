/**
 * Enrollment Service
 * V2 API - Service functions for course enrollment lifecycle
 * 
 * Handles transitions between CourseEnrollmentCurrent and CourseEnrollmentActivity
 */

import mongoose from 'mongoose';
import CourseEnrollmentCurrent from '../model/Academic/CourseEnrollmentCurrent';
import CourseEnrollmentActivity from '../model/Academic/CourseEnrollmentActivity';
import { ICourseEnrollmentCurrent, ICourseEnrollmentActivity } from '../types/models-types';
import { NotFoundError, ValidationError } from './errors';

/**
 * Start a new course enrollment
 * Creates a CourseEnrollmentCurrent record
 */
export const startCourseEnrollment = async (
  learnerId: string,
  courseId: string,
  programEnrollmentId: string,
  classId?: string
): Promise<ICourseEnrollmentCurrent> => {
  // Check for existing enrollment
  const existing = await CourseEnrollmentCurrent.findOne({
    learner: new mongoose.Types.ObjectId(learnerId),
    course: new mongoose.Types.ObjectId(courseId),
  });

  if (existing) {
    throw new ValidationError('Learner is already enrolled in this course');
  }

  // Note: Schema uses enrolledAt (not startedAt), and progress has nested sub-arrays
  const enrollmentData: any = {
    learner: new mongoose.Types.ObjectId(learnerId),
    course: new mongoose.Types.ObjectId(courseId),
    programEnrollment: new mongoose.Types.ObjectId(programEnrollmentId),
    enrolledAt: new Date(),
    progress: {},
    lastActivityAt: new Date(),
  };

  // Add classId if provided
  if (classId) {
    enrollmentData.classEnrollment = new mongoose.Types.ObjectId(classId);
  }

  const enrollment = await CourseEnrollmentCurrent.create(enrollmentData);

  return enrollment;
};

/**
 * Update course progress
 * Updates progress in CourseEnrollmentCurrent
 */
export const updateCourseProgress = async (
  currentEnrollmentId: string,
  progressUpdate: { examAttempts?: any[]; mediaProgress?: any[]; scormAttempts?: any[] }
): Promise<ICourseEnrollmentCurrent> => {
  const enrollment = await CourseEnrollmentCurrent.findById(currentEnrollmentId);

  if (!enrollment) {
    throw new NotFoundError('Course enrollment not found');
  }

  // Update progress fields if provided
  if (progressUpdate.examAttempts) {
    (enrollment.progress as any).examAttempts = progressUpdate.examAttempts;
  }
  if (progressUpdate.mediaProgress) {
    (enrollment.progress as any).mediaProgress = progressUpdate.mediaProgress;
  }
  if (progressUpdate.scormAttempts) {
    (enrollment.progress as any).scormAttempts = progressUpdate.scormAttempts;
  }

  // Update activity timestamp
  enrollment.lastActivityAt = new Date();

  await enrollment.save();
  return enrollment;
};

/**
 * Complete a course enrollment
 * Moves record from CourseEnrollmentCurrent to CourseEnrollmentActivity
 */
export const completeCourseEnrollment = async (
  currentEnrollmentId: string,
  outcome: 'passed' | 'failed',
  grade?: number
): Promise<ICourseEnrollmentActivity> => {
  const current = await CourseEnrollmentCurrent.findById(currentEnrollmentId);

  if (!current) {
    throw new NotFoundError('Course enrollment not found');
  }

  // Create activity record
  const activity = await CourseEnrollmentActivity.create({
    learner: current.learner,
    course: current.course,
    programEnrollment: current.programEnrollment,
    outcome,
    finalScoring: grade !== undefined ? { percentage: grade } : undefined,
    enrolledAt: current.enrolledAt,
    completedAt: new Date(),
    // Copy final progress state into attempt history
    attemptHistory: {
      examAttempts: (current.progress as any)?.examAttempts,
      mediaProgress: (current.progress as any)?.mediaProgress,
      scormAttempts: (current.progress as any)?.scormAttempts,
    },
  });

  // Delete the current enrollment
  await CourseEnrollmentCurrent.findByIdAndDelete(currentEnrollmentId);

  return activity;
};

/**
 * Withdraw from a course
 * Moves record from CourseEnrollmentCurrent to CourseEnrollmentActivity with withdrawn status
 */
export const withdrawFromCourse = async (
  currentEnrollmentId: string,
  reason?: string
): Promise<ICourseEnrollmentActivity> => {
  const current = await CourseEnrollmentCurrent.findById(currentEnrollmentId);

  if (!current) {
    throw new NotFoundError('Course enrollment not found');
  }

  // Create activity record with withdrawn status
  const activity = await CourseEnrollmentActivity.create({
    learner: current.learner,
    course: current.course,
    programEnrollment: current.programEnrollment,
    outcome: 'withdrawn',
    withdrawalReason: reason,
    enrolledAt: current.enrolledAt,
    completedAt: new Date(), // Use completedAt for withdrawal date
    // Copy progress state at time of withdrawal
    attemptHistory: {
      examAttempts: (current.progress as any)?.examAttempts,
      mediaProgress: (current.progress as any)?.mediaProgress,
      scormAttempts: (current.progress as any)?.scormAttempts,
    },
  });

  // Delete the current enrollment
  await CourseEnrollmentCurrent.findByIdAndDelete(currentEnrollmentId);

  return activity;
};
