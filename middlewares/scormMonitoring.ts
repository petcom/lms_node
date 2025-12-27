/**
 * SCORM Monitoring Middleware
 * Tracks metrics and performance for SCORM operations
 */

import { Request, Response, NextFunction } from 'express';
import ScormLogger from '../utils/scorm/scormLogger';

// In-memory metrics storage (replace with Redis in production)
export class ScormMetrics {
  private static metrics = {
    activeSessions: new Set<string>(),
    packageUploads: { total: 0, success: 0, failed: 0 },
    attemptStarts: { total: 0, success: 0, failed: 0 },
    attemptCompletions: { total: 0, passed: 0, failed: 0 },
    apiCalls: { total: 0, initialize: 0, getValue: 0, setValue: 0, commit: 0, terminate: 0 },
    responseTimes: [] as number[],
    storageUsage: 0,
    errors: [] as Array<{ timestamp: Date; error: string; endpoint: string }>,
  };

  /**
   * Track active SCORM session
   */
  static addActiveSession(attemptId: string): void {
    this.metrics.activeSessions.add(attemptId);
  }

  /**
   * Remove active SCORM session
   */
  static removeActiveSession(attemptId: string): void {
    this.metrics.activeSessions.delete(attemptId);
  }

  /**
   * Get active session count
   */
  static getActiveSessionCount(): number {
    return this.metrics.activeSessions.size;
  }

  /**
   * Record package upload
   */
  static recordPackageUpload(success: boolean): void {
    this.metrics.packageUploads.total++;
    if (success) {
      this.metrics.packageUploads.success++;
    } else {
      this.metrics.packageUploads.failed++;
    }
  }

  /**
   * Record attempt start
   */
  static recordAttemptStart(success: boolean): void {
    this.metrics.attemptStarts.total++;
    if (success) {
      this.metrics.attemptStarts.success++;
    } else {
      this.metrics.attemptStarts.failed++;
    }
  }

  /**
   * Record attempt completion
   */
  static recordAttemptCompletion(passed: boolean): void {
    this.metrics.attemptCompletions.total++;
    if (passed) {
      this.metrics.attemptCompletions.passed++;
    } else {
      this.metrics.attemptCompletions.failed++;
    }
  }

  /**
   * Record API call
   */
  static recordApiCall(type: string): void {
    this.metrics.apiCalls.total++;
    const callType = type.toLowerCase() as keyof typeof this.metrics.apiCalls;
    if (callType in this.metrics.apiCalls) {
      (this.metrics.apiCalls[callType] as number)++;
    }
  }

  /**
   * Record response time
   */
  static recordResponseTime(duration: number): void {
    this.metrics.responseTimes.push(duration);
    // Keep only last 1000 response times
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }
  }

  /**
   * Get average response time
   */
  static getAverageResponseTime(): number {
    if (this.metrics.responseTimes.length === 0) return 0;
    const sum = this.metrics.responseTimes.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / this.metrics.responseTimes.length);
  }

  /**
   * Update storage usage
   */
  static updateStorageUsage(bytes: number): void {
    this.metrics.storageUsage += bytes;
  }

  /**
   * Record error
   */
  static recordError(error: string, endpoint: string): void {
    this.metrics.errors.push({
      timestamp: new Date(),
      error,
      endpoint,
    });
    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Get all metrics
   */
  static getMetrics() {
    return {
      activeSessions: this.getActiveSessionCount(),
      packageUploads: this.metrics.packageUploads,
      attemptStarts: this.metrics.attemptStarts,
      attemptCompletions: this.metrics.attemptCompletions,
      apiCalls: this.metrics.apiCalls,
      averageResponseTime: this.getAverageResponseTime(),
      storageUsageBytes: this.metrics.storageUsage,
      storageUsageMB: Math.round(this.metrics.storageUsage / (1024 * 1024)),
      recentErrors: this.metrics.errors.slice(-10),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset metrics (for testing)
   */
  static reset(): void {
    this.metrics = {
      activeSessions: new Set<string>(),
      packageUploads: { total: 0, success: 0, failed: 0 },
      attemptStarts: { total: 0, success: 0, failed: 0 },
      attemptCompletions: { total: 0, passed: 0, failed: 0 },
      apiCalls: { total: 0, initialize: 0, getValue: 0, setValue: 0, commit: 0, terminate: 0 },
      responseTimes: [],
      storageUsage: 0,
      errors: [],
    };
  }
}

/**
 * Middleware to track SCORM API performance
 */
export const scormPerformanceMonitor = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Track response completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    ScormMetrics.recordResponseTime(duration);

    // Log slow requests (over 2 seconds)
    if (duration > 2000) {
      ScormLogger.logPerformance({
        operation: `${req.method} ${req.path}`,
        duration,
        packageId: req.params.packageId || req.params.id,
      });
    }

    // Track errors
    if (res.statusCode >= 400) {
      ScormMetrics.recordError(`HTTP ${res.statusCode}`, `${req.method} ${req.path}`);
    }
  });

  next();
};

/**
 * Middleware to track SCORM-specific operations
 */
export const scormOperationTracker = (operation: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Extract context from request
    const context = {
      packageId: req.params.packageId || req.params.id,
      attemptId: req.params.attemptId,
      studentId: (req as any).user?.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };

    // Store context for later use
    (req as any).scormContext = context;

    // Track specific operations
    switch (operation) {
      case 'initialize':
        ScormMetrics.recordApiCall('initialize');
        break;
      case 'getValue':
        ScormMetrics.recordApiCall('getValue');
        break;
      case 'setValue':
        ScormMetrics.recordApiCall('setValue');
        break;
      case 'commit':
        ScormMetrics.recordApiCall('commit');
        break;
      case 'terminate':
        ScormMetrics.recordApiCall('terminate');
        break;
    }

    next();
  };
};

/**
 * Health check endpoint helper
 */
export const getScormHealthStatus = () => {
  const metrics = ScormMetrics.getMetrics();
  const avgResponseTime = metrics.averageResponseTime;
  const errorRate = metrics.recentErrors.length;

  let status = 'healthy';
  const issues: string[] = [];

  // Check for issues
  if (avgResponseTime > 1000) {
    status = 'degraded';
    issues.push('High average response time');
  }

  if (errorRate > 5) {
    status = 'degraded';
    issues.push('High error rate');
  }

  if (metrics.activeSessions > 1000) {
    status = 'degraded';
    issues.push('High number of active sessions');
  }

  if (metrics.storageUsageMB > 10000) {
    issues.push('Storage usage over 10GB');
  }

  return {
    status,
    metrics,
    issues: issues.length > 0 ? issues : undefined,
    timestamp: new Date().toISOString(),
  };
};

export default {
  ScormMetrics,
  scormPerformanceMonitor,
  scormOperationTracker,
  getScormHealthStatus,
};
