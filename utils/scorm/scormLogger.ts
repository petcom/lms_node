/**
 * SCORM Event Logger
 * Specialized logging for SCORM events and operations
 */

import logger from '../logger';
import { Types } from 'mongoose';

export interface ScormEventContext {
  packageId?: string;
  attemptId?: string;
  studentId?: string | Types.ObjectId;
  teacherId?: string | Types.ObjectId;
  action?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

/**
 * SCORM-specific logger with structured event tracking
 */
export class ScormLogger {
  /**
   * Log package upload event
   */
  static logPackageUpload(context: ScormEventContext): void {
    logger.info('SCORM package uploaded', {
      event: 'scorm.package.upload',
      packageId: context.packageId,
      fileName: context.fileName,
      fileSize: context.fileSize,
      version: context.version,
      uploadedBy: context.teacherId || context.studentId,
      ipAddress: context.ipAddress,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log package publish/unpublish event
   */
  static logPackageStatusChange(
    packageId: string,
    oldStatus: string,
    newStatus: string,
    userId: string | Types.ObjectId
  ): void {
    logger.info('SCORM package status changed', {
      event: 'scorm.package.status_change',
      packageId,
      oldStatus,
      newStatus,
      changedBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log package assignment
   */
  static logPackageAssignment(context: ScormEventContext): void {
    logger.info('SCORM package assigned to students', {
      event: 'scorm.package.assignment',
      packageId: context.packageId,
      studentCount: context.studentCount,
      assignedBy: context.teacherId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log attempt initialization
   */
  static logAttemptStart(context: ScormEventContext): void {
    logger.info('SCORM attempt started', {
      event: 'scorm.attempt.start',
      attemptId: context.attemptId,
      packageId: context.packageId,
      studentId: context.studentId,
      attemptNumber: context.attemptNumber,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log attempt completion
   */
  static logAttemptComplete(context: ScormEventContext): void {
    logger.info('SCORM attempt completed', {
      event: 'scorm.attempt.complete',
      attemptId: context.attemptId,
      packageId: context.packageId,
      studentId: context.studentId,
      score: context.score,
      completionStatus: context.completionStatus,
      timeSpent: context.timeSpent,
      passed: context.passed,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log CMI data set operation
   */
  static logCmiSet(context: ScormEventContext): void {
    logger.debug('SCORM CMI data set', {
      event: 'scorm.cmi.set',
      attemptId: context.attemptId,
      element: context.element,
      value: context.value,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log session timeout
   */
  static logSessionTimeout(context: ScormEventContext): void {
    logger.warn('SCORM session timeout', {
      event: 'scorm.session.timeout',
      attemptId: context.attemptId,
      packageId: context.packageId,
      studentId: context.studentId,
      sessionDuration: context.sessionDuration,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log content player launch
   */
  static logPlayerLaunch(context: ScormEventContext): void {
    logger.info('SCORM player launched', {
      event: 'scorm.player.launch',
      packageId: context.packageId,
      studentId: context.studentId,
      attemptId: context.attemptId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log data export
   */
  static logDataExport(context: ScormEventContext): void {
    logger.info('SCORM data exported', {
      event: 'scorm.report.export',
      format: context.format,
      packageId: context.packageId,
      studentId: context.studentId,
      exportedBy: context.teacherId,
      recordCount: context.recordCount,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log SCORM error
   */
  static logError(context: ScormEventContext, error: Error): void {
    logger.error('SCORM operation error', {
      event: 'scorm.error',
      errorType: context.errorType || 'unknown',
      errorMessage: error.message,
      errorStack: error.stack,
      packageId: context.packageId,
      attemptId: context.attemptId,
      studentId: context.studentId,
      action: context.action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log analytics access
   */
  static logAnalyticsAccess(context: ScormEventContext): void {
    logger.info('SCORM analytics accessed', {
      event: 'scorm.analytics.access',
      packageId: context.packageId,
      reportType: context.reportType,
      accessedBy: context.teacherId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log package deletion
   */
  static logPackageDeletion(context: ScormEventContext): void {
    logger.warn('SCORM package deleted', {
      event: 'scorm.package.delete',
      packageId: context.packageId,
      title: context.title,
      deletedBy: context.teacherId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log storage operation
   */
  static logStorageOperation(operation: string, context: ScormEventContext): void {
    logger.debug('SCORM storage operation', {
      event: 'scorm.storage.operation',
      operation,
      packageId: context.packageId,
      fileName: context.fileName,
      fileSize: context.fileSize,
      storageProvider: context.storageProvider,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log Redis session operation
   */
  static logSessionOperation(operation: string, context: ScormEventContext): void {
    logger.debug('SCORM session operation', {
      event: 'scorm.session.operation',
      operation,
      attemptId: context.attemptId,
      sessionStatus: context.sessionStatus,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log performance metrics
   */
  static logPerformance(context: ScormEventContext): void {
    logger.info('SCORM performance metric', {
      event: 'scorm.performance',
      operation: context.operation,
      duration: context.duration,
      packageId: context.packageId,
      timestamp: new Date().toISOString(),
    });
  }
}

export default ScormLogger;
