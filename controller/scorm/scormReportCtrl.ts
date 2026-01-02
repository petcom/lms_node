/**
 * SCORM Report Controller
 *
 * Handles tracking and reporting endpoints for SCORM content
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import ScormPackage from '../../model/Scorm/ScormPackage';
import Learner from '../../model/Academic/Learner';
import ProgramEnrollment from '../../model/Academic/ProgramEnrollment';
import ClassEnrollment from '../../model/Academic/ClassEnrollment';
import { AuthorizationError, ValidationError } from '../../utils/errors';
import { getPersonDisplayName } from '../../utils/person';
import {
  calculateBestScore,
  calculateAverageScore,
  calculateTotalTimeSpent,
  calculateCompletionRate,
  aggregateScoreDistribution,
  aggregateTimeDistribution,
  calculateScoreStatistics,
  calculateTimeStatistics,
  aggregateGradesDistribution,
  isAttemptCompleted,
  isAttemptPassed,
  getAttemptScore,
  formatTimeForDisplay,
} from '../../utils/scorm/completionCalculator';

type DepartmentScope = string[] | 'all' | undefined;

const isPackageAccessible = (
  pkg: any,
  role: string | undefined,
  userId: string | undefined,
  scope: DepartmentScope
): boolean => {
  if (!pkg) return false;
  if (pkg.isGlobal) return true;

  const pkgDept = pkg.department?.toString();
  if (role === 'global-admin') {
    if (!scope || scope === 'all') return true;
    return !!pkgDept && scope.includes(pkgDept);
  }

  if (role === 'staff') {
    const owner = pkg.uploadedBy?.toString?.();
    if (owner && owner === userId) return true;
    if (scope && scope !== 'all') {
      return !!pkgDept && scope.includes(pkgDept);
    }
    return false;
  }

  return true;
};

const parseDateRange = (start?: string | string[], end?: string | string[]) => {
  const parsed: { start?: Date; end?: Date } = {};
  if (start) {
    const d = new Date(start as string);
    if (Number.isNaN(d.getTime())) throw new ValidationError('Invalid startDate');
    parsed.start = d;
  }
  if (end) {
    const d = new Date(end as string);
    if (Number.isNaN(d.getTime())) throw new ValidationError('Invalid endDate');
    parsed.end = d;
  }
  return parsed;
};

const applyPagination = <T>(items: T[], pageRaw: any, limitRaw: any) => {
  const page = Math.max(1, Number(pageRaw) || 1);
  const limit = Math.max(1, Math.min(100, Number(limitRaw) || 10));
  const start = (page - 1) * limit;
  const data = items.slice(start, start + limit);
  const total = items.length;
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

const mapErrorToStatus = (error: any): number => {
  if (error instanceof AuthorizationError) return 403;
  if (error instanceof ValidationError) return 400;
  return 500;
};

/**
 * Get learner progress across all SCORM packages
 * GET /api/v1/scorm/reports/learner/:learnerId
 */
export const getLearnerProgress = async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;
    const { startDate, endDate, packageId, program, programLevel } = req.query;

    const role = req.userAuth?.role;
    const userId = req.userAuth?._id?.toString();
    const scope = req.departmentScope?.accessibleDepartmentIds as DepartmentScope;

    if (role === 'learner' && userId !== learnerId) {
      throw new AuthorizationError('Learners can only view their own progress');
    }

    const { start, end } = parseDateRange(startDate as string, endDate as string);

    const query: any = { learner: learnerId };
    if (start || end) {
      query.startedAt = {};
      if (start) query.startedAt.$gte = start;
      if (end) query.startedAt.$lte = end;
    }

    if (packageId) {
      if (!mongoose.isValidObjectId(packageId as any)) {
        throw new ValidationError('Invalid packageId');
      }
      query.package = packageId;
    }

    // Get all attempts for this learner
    const attempts = await ScormAttempt.find(query)
      .populate('package')
      .sort({ startedAt: -1 });

    // Get learner info
    const learner = await Learner.findById(learnerId).select('name email');

    if (!learner) {
      return res.status(404).json({
        success: false,
        message: 'Learner not found',
      });
    }

    const packageMap = new Map();

    attempts.forEach((attempt) => {
      const pkg = attempt.package as any;
      if (!pkg) return;

      if (!isPackageAccessible(pkg, role, userId, scope)) {
        return;
      }

      if (program && pkg.program?.toString() !== String(program)) return;
      if (programLevel && pkg.programLevel?.toString() !== String(programLevel)) return;

      const packageId = pkg._id.toString();

      if (!packageMap.has(packageId)) {
        packageMap.set(packageId, {
          packageId: pkg._id,
          title: pkg.title,
          version: pkg.version,
          attempts: [],
        });
      }

      packageMap.get(packageId).attempts.push({
        attemptId: attempt.attemptId,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        lastAccessedAt: attempt.lastAccessedAt,
        status: attempt.status,
        score: getAttemptScore(attempt),
        timeSpent: calculateTotalTimeSpent([attempt]),
      });
    });

    // Calculate summary for each package
    const packages = Array.from(packageMap.values()).map((pkg) => {
      const packageAttempts = attempts.filter(
        (a) => (a.package as any)._id.toString() === pkg.packageId.toString()
      );

      const bestScore = calculateBestScore(packageAttempts);
      const totalTimeSpent = calculateTotalTimeSpent(packageAttempts);
      const completedAttempts = packageAttempts.filter(isAttemptCompleted);
      const completionStatus = completedAttempts.length > 0 ? 'completed' : 'in_progress';
      const lastAccessed = packageAttempts.length > 0 ? packageAttempts[0].lastAccessedAt : null;

      return {
        ...pkg,
        bestScore,
        totalAttempts: pkg.attempts.length,
        completionStatus,
        totalTimeSpent,
        lastAccessed,
      };
    });

    // Calculate overall summary
    const totalPackages = packages.length;
    const completedPackages = packages.filter((p) => p.completionStatus === 'completed').length;
    const allAttempts = Array.from(packageMap.values()).flatMap((p) =>
      attempts.filter((a) => (a.package as any)._id.toString() === p.packageId.toString())
    );
    const averageScore = calculateAverageScore(allAttempts);
    const totalTimeSpent = calculateTotalTimeSpent(allAttempts);

    const paged = applyPagination(packages, req.query.page, req.query.limit);

    return res.status(200).json({
      success: true,
      data: {
        learnerId: learner._id,
        learnerName: getPersonDisplayName((learner as any).name),
        learnerEmail: (learner as any).email,
        packages: paged.data,
        pagination: paged.pagination,
        summary: {
          totalPackages,
          completedPackages,
          averageScore,
          totalTimeSpent,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting learner progress:', error);
    const status = mapErrorToStatus(error);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to get learner progress',
      error: error.message,
    });
  }
};

/**
 * Get package analytics for staff
 * GET /api/v1/scorm/reports/package/:packageId/analytics
 */
export const getPackageAnalytics = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { startDate, endDate, learnerId, program, programLevel } = req.query;

    const role = req.userAuth?.role;
    const userId = req.userAuth?._id?.toString();
    const scope = req.departmentScope?.accessibleDepartmentIds as DepartmentScope;

    // Get package
    const pkg = await ScormPackage.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    if (!isPackageAccessible(pkg, role, userId, scope)) {
      throw new AuthorizationError('Access denied for this package');
    }

    const { start, end } = parseDateRange(startDate as string, endDate as string);

    // Build query for attempts
    const query: any = { package: packageId };

    if (start || end) {
      query.startedAt = {};
      if (start) query.startedAt.$gte = start;
      if (end) query.startedAt.$lte = end;
    }

    if (learnerId) {
      if (!mongoose.isValidObjectId(learnerId as any)) {
        throw new ValidationError('Invalid learnerId');
      }
      query.learner = learnerId;
    }

    if (program && !mongoose.isValidObjectId(program as any)) {
      throw new ValidationError('Invalid program');
    }

    if (programLevel && !mongoose.isValidObjectId(programLevel as any)) {
      throw new ValidationError('Invalid programLevel');
    }

    // Get all attempts for this package
    const attempts = await ScormAttempt.find(query)
      .populate('learner', 'name email')
      .sort({ startedAt: -1 });

    const programLearners =
      program && mongoose.isValidObjectId(program as any)
        ? new Set(
            (
              await ProgramEnrollment.find({ program }).select('learner').lean()
            ).map((enrollment) => enrollment.learner.toString())
          )
        : null;

    const programLevelLearners =
      programLevel && mongoose.isValidObjectId(programLevel as any)
        ? new Set(
            (
              await ClassEnrollment.find({ programLevel }).select('learner').lean()
            ).map((enrollment) => enrollment.learner.toString())
          )
        : null;

    const filteredAttempts = attempts.filter((a) => {
      const learner = a.learner as any;
      if (programLearners && !programLearners.has(learner?._id?.toString?.() || '')) return false;
      if (
        programLevelLearners &&
        !programLevelLearners.has(learner?._id?.toString?.() || '')
      ) {
        return false;
      }
      return true;
    });

    // Get unique learners
    const learnerIds = [...new Set(filteredAttempts.map((a) => (a.learner as any)._id.toString()))];
    const totalLearners = learnerIds.length;
    const learnersStarted = learnerIds.length;

    // Calculate completion metrics
    const completedAttempts = filteredAttempts.filter(isAttemptCompleted);
    const learnersCompleted = [
      ...new Set(completedAttempts.map((a) => (a.learner as any)._id.toString())),
    ].length;
    const completionRate = calculateCompletionRate(learnersStarted, learnersCompleted);

    // Calculate score and time metrics
    const attemptsWithScores = filteredAttempts.filter((a) => getAttemptScore(a) !== null);
    const averageScore = calculateAverageScore(attemptsWithScores);
    const averageTimeSpent =
      attemptsWithScores.length > 0
        ? Math.round(calculateTotalTimeSpent(attemptsWithScores) / attemptsWithScores.length)
        : 0;

    // Calculate pass rate
    const passedAttempts = filteredAttempts.filter((a) => isAttemptPassed(a, pkg));
    const passRate =
      attemptsWithScores.length > 0
        ? Math.round((passedAttempts.length / attemptsWithScores.length) * 100)
        : 0;

    // Group by learner
    const learnerMap = new Map();

    filteredAttempts.forEach((attempt) => {
      const learner = attempt.learner as any;
      if (!learner) return;

      const learnerId = learner._id.toString();

      if (!learnerMap.has(learnerId)) {
        learnerMap.set(learnerId, {
          learnerId: learner._id,
          learnerName: getPersonDisplayName(learner.name),
          learnerEmail: learner.email,
          attempts: [],
        });
      }

      learnerMap.get(learnerId).attempts.push(attempt);
    });

    // Calculate per-learner metrics
    const learners = Array.from(learnerMap.values()).map((learner) => {
      const learnerAttempts = learner.attempts;
      const bestScore = calculateBestScore(learnerAttempts);
      const avgScore = calculateAverageScore(learnerAttempts);
      const timeSpent = calculateTotalTimeSpent(learnerAttempts);
      const completed = learnerAttempts.some(isAttemptCompleted);
      const status = completed ? 'completed' : 'in_progress';
      const lastAccessed = learnerAttempts[0]?.lastAccessedAt;
      const firstAccessed = learnerAttempts[learnerAttempts.length - 1]?.startedAt;

      return {
        learnerId: learner.learnerId,
        learnerName: learner.learnerName,
        learnerEmail: learner.learnerEmail,
        attempts: learnerAttempts.length,
        bestScore,
        averageScore: avgScore,
        status,
        timeSpent,
        lastAccessed,
        firstAccessed,
      };
    });

    // Calculate distributions
    const scoreDistribution = aggregateScoreDistribution(attemptsWithScores);
    const timeDistribution = aggregateTimeDistribution(filteredAttempts);

    const paged = applyPagination(learners, req.query.page, req.query.limit);

    return res.status(200).json({
      success: true,
      data: {
        packageId: pkg._id,
        packageTitle: pkg.title,
        dateRange: {
          start: startDate || null,
          end: endDate || null,
        },
        summary: {
          totalLearners,
          learnersStarted,
          learnersCompleted,
          completionRate,
          averageScore,
          averageTimeSpent,
          passRate,
        },
        learners: paged.data,
        pagination: paged.pagination,
        scoreDistribution,
        timeDistribution,
      },
    });
  } catch (error: any) {
    console.error('Error getting package analytics:', error);
    const status = mapErrorToStatus(error);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to get package analytics',
      error: error.message,
    });
  }
};

/**
 * Get detailed attempt information
 * GET /api/v1/scorm/reports/attempts/:attemptId
 */
export const getAttemptDetails = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;

    const role = req.userAuth?.role;
    const userId = req.userAuth?._id?.toString();
    const scope = req.departmentScope?.accessibleDepartmentIds as DepartmentScope;

    const attempt = await ScormAttempt.findOne({ attemptId })
      .populate('learner', 'name email')
      .populate('package', 'title version manifest');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    const learner = attempt.learner as any;
    const pkg = attempt.package as any;

    if (role === 'learner' && learner?._id?.toString() !== userId) {
      throw new AuthorizationError('Access denied for this attempt');
    }

    if ((role === 'staff' || role === 'global-admin') && !isPackageAccessible(pkg, role, userId, scope)) {
      throw new AuthorizationError('Access denied for this package');
    }

    return res.status(200).json({
      success: true,
      data: {
        attemptId: attempt.attemptId,
        learner: {
          id: learner._id,
          name: getPersonDisplayName(learner.name),
          email: learner.email,
        },
        package: {
          id: pkg._id,
          title: pkg.title,
          version: pkg.version,
        },
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        lastAccessedAt: attempt.lastAccessedAt,
        completedAt: attempt.completedAt,
        status: attempt.status,
        cmi: attempt.cmi,
        sessionLog: (attempt as any).sessionLog || [],
      },
    });
  } catch (error: any) {
    console.error('Error getting attempt details:', error);
    const status = mapErrorToStatus(error);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to get attempt details',
      error: error.message,
    });
  }
};

/**
 * Export tracking data
 * GET /api/v1/scorm/reports/export
 */
export const exportTrackingData = async (req: Request, res: Response) => {
  try {
    const { packageId, learnerId, startDate, endDate, format = 'json', program, programLevel } =
      req.query;

    const role = req.userAuth?.role;
    const userId = req.userAuth?._id?.toString();
    const scope = req.departmentScope?.accessibleDepartmentIds as DepartmentScope;

    if (role !== 'staff' && role !== 'global-admin') {
      throw new AuthorizationError('Only staff or admins can export tracking data');
    }

    const { start, end } = parseDateRange(startDate as string, endDate as string);

    // Build query
    const query: any = {};
    if (packageId) {
      if (!mongoose.isValidObjectId(packageId as any)) {
        throw new ValidationError('Invalid packageId');
      }
      query.package = packageId;
    }
    if (learnerId) {
      if (!mongoose.isValidObjectId(learnerId as any)) {
        throw new ValidationError('Invalid learnerId');
      }
      query.learner = learnerId;
    }
    if (start || end) {
      query.startedAt = {};
      if (start) query.startedAt.$gte = start;
      if (end) query.startedAt.$lte = end;
    }

    if (program && !mongoose.isValidObjectId(program as any)) {
      throw new ValidationError('Invalid program');
    }

    if (programLevel && !mongoose.isValidObjectId(programLevel as any)) {
      throw new ValidationError('Invalid programLevel');
    }

    // Get attempts
    const attempts = await ScormAttempt.find(query)
      .populate('learner', 'name email')
      .populate('package', 'title version department uploadedBy isGlobal program programLevel')
      .sort({ startedAt: -1 });

    const programLearners =
      program && mongoose.isValidObjectId(program as any)
        ? new Set(
            (
              await ProgramEnrollment.find({ program }).select('learner').lean()
            ).map((enrollment) => enrollment.learner.toString())
          )
        : null;

    const programLevelLearners =
      programLevel && mongoose.isValidObjectId(programLevel as any)
        ? new Set(
            (
              await ClassEnrollment.find({ programLevel }).select('learner').lean()
            ).map((enrollment) => enrollment.learner.toString())
          )
        : null;

    const filteredAttempts = attempts.filter((attempt) => {
      const pkg = attempt.package as any;
      if (!isPackageAccessible(pkg, role, userId, scope)) return false;
      const learner = attempt.learner as any;
      if (programLearners && !programLearners.has(learner?._id?.toString?.() || '')) {
        return false;
      }
      if (
        programLevelLearners &&
        !programLevelLearners.has(learner?._id?.toString?.() || '')
      ) {
        return false;
      }
      return true;
    });

    // Prepare export data
    const exportData = filteredAttempts.map((attempt) => {
      const learner = attempt.learner as any;
      const pkg = attempt.package as any;
      const score = getAttemptScore(attempt);
      const timeSpent = calculateTotalTimeSpent([attempt]);
      const cmi = attempt.cmi as any;

      return {
        learnerId: learner._id,
        learnerName: getPersonDisplayName(learner.name),
        learnerEmail: learner.email,
        packageId: pkg._id,
        packageTitle: pkg.title,
        packageVersion: pkg.version,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        lastAccessedAt: attempt.lastAccessedAt,
        status: attempt.status,
        score,
        timeSpentSeconds: timeSpent,
        timeSpentFormatted: formatTimeForDisplay(timeSpent),
        completionStatus: cmi.completion_status || cmi.lesson_status || 'unknown',
        successStatus:
          cmi.success_status || (cmi.lesson_status === 'passed' ? 'passed' : 'unknown'),
      };
    });

    const paged = applyPagination(exportData, req.query.page, req.query.limit || 100);

    // Format output based on requested format
    const filenameBase = `scorm-export-${Date.now()}`;
    if (format === 'csv') {
      const csv = convertToCSV(paged.data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      return res.send(csv);
    } else if (format === 'xlsx') {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(paged.data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
      const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
      return res.send(buffer);
    } else {
      const jsonExport = {
        exportDate: new Date().toISOString(),
        filters: { packageId, learnerId, startDate, endDate, program, programLevel },
        totalRecords: exportData.length,
        page: paged.pagination.page,
        pages: paged.pagination.pages,
        limit: paged.pagination.limit,
        data: paged.data,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.json"`);
      return res.json(jsonExport);
    }
  } catch (error: any) {
    console.error('Error exporting tracking data:', error);
    const status = mapErrorToStatus(error);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to export tracking data',
      error: error.message,
    });
  }
};

/**
 * Get completion rates over time
 * GET /api/v1/scorm/reports/completion/:packageId
 */
export const getCompletionRates = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { startDate, endDate } = req.query;

    const role = req.userAuth?.role;
    const userId = req.userAuth?._id?.toString();
    const scope = req.departmentScope?.accessibleDepartmentIds as DepartmentScope;

    const pkg = await ScormPackage.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    if (!isPackageAccessible(pkg, role, userId, scope)) {
      throw new AuthorizationError('Access denied for this package');
    }

    const { start, end } = parseDateRange(startDate as string, endDate as string);

    // Build query
    const query: any = { package: packageId };
    if (start || end) {
      query.startedAt = {};
      if (start) query.startedAt.$gte = start;
      if (end) query.startedAt.$lte = end;
    }

    const attempts = await ScormAttempt.find(query);

    // Calculate overall metrics
    const uniqueLearners = [...new Set(attempts.map((a) => a.learner.toString()))];
    const completedLearners = [
      ...new Set(attempts.filter(isAttemptCompleted).map((a) => a.learner.toString())),
    ];

    const overall = {
      totalLearners: uniqueLearners.length,
      completedLearners: completedLearners.length,
      completionRate: calculateCompletionRate(uniqueLearners.length, completedLearners.length),
    };

    // Group by time period (simplified - just return overall for now)
    const timeline = [
      {
        period: 'overall',
        started: uniqueLearners.length,
        completed: completedLearners.length,
        completionRate: overall.completionRate,
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        packageId: pkg._id,
        packageTitle: pkg.title,
        overall,
        timeline,
      },
    });
  } catch (error: any) {
    console.error('Error getting completion rates:', error);
    const status = mapErrorToStatus(error);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to get completion rates',
      error: error.message,
    });
  }
};

/**
 * Get score distribution for a package
 * GET /api/v1/scorm/reports/scores/:packageId
 */
export const getScoreDistribution = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { startDate, endDate } = req.query;

    const role = req.userAuth?.role;
    const userId = req.userAuth?._id?.toString();
    const scope = req.departmentScope?.accessibleDepartmentIds as DepartmentScope;

    const pkg = await ScormPackage.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    if (!isPackageAccessible(pkg, role, userId, scope)) {
      throw new AuthorizationError('Access denied for this package');
    }

    const { start, end } = parseDateRange(startDate as string, endDate as string);

    const attemptQuery: any = { package: packageId };
    if (start || end) {
      attemptQuery.startedAt = {};
      if (start) attemptQuery.startedAt.$gte = start;
      if (end) attemptQuery.startedAt.$lte = end;
    }

    const attempts = await ScormAttempt.find(attemptQuery);
    const attemptsWithScores = attempts.filter((a) => getAttemptScore(a) !== null);

    if (attemptsWithScores.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          packageId: pkg._id,
          packageTitle: pkg.title,
          message: 'No scored attempts found',
          statistics: null,
          distribution: [],
          grades: [],
        },
      });
    }

    const statistics = calculateScoreStatistics(attemptsWithScores);
    const scoreDistribution = aggregateScoreDistribution(attemptsWithScores);
    const grades = aggregateGradesDistribution(attemptsWithScores);

    // Format distribution
    const distribution = scoreDistribution.bins.map((bin, index) => ({
      range: bin,
      count: scoreDistribution.counts[index],
      percentage: scoreDistribution.percentages[index],
    }));

    return res.status(200).json({
      success: true,
      data: {
        packageId: pkg._id,
        packageTitle: pkg.title,
        statistics,
        distribution,
        grades,
      },
    });
  } catch (error: any) {
    console.error('Error getting score distribution:', error);
    const status = mapErrorToStatus(error);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to get score distribution',
      error: error.message,
    });
  }
};

/**
 * Get time analytics for a package
 * GET /api/v1/scorm/reports/time/:packageId
 */
export const getTimeAnalytics = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { startDate, endDate } = req.query;

    const role = req.userAuth?.role;
    const userId = req.userAuth?._id?.toString();
    const scope = req.departmentScope?.accessibleDepartmentIds as DepartmentScope;

    const pkg = await ScormPackage.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    if (!isPackageAccessible(pkg, role, userId, scope)) {
      throw new AuthorizationError('Access denied for this package');
    }

    const { start, end } = parseDateRange(startDate as string, endDate as string);

    const query: any = { package: packageId };
    if (start || end) {
      query.startedAt = {};
      if (start) query.startedAt.$gte = start;
      if (end) query.startedAt.$lte = end;
    }

    const attempts = await ScormAttempt.find(query);

    if (attempts.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          packageId: pkg._id,
          packageTitle: pkg.title,
          message: 'No attempts found',
          statistics: null,
          distribution: [],
        },
      });
    }

    const statistics = calculateTimeStatistics(attempts);
    const timeDistribution = aggregateTimeDistribution(attempts);

    // Format distribution
    const distribution = timeDistribution.bins.map((bin, index) => ({
      range: `${bin} min`,
      count: timeDistribution.counts[index],
      percentage: timeDistribution.percentages[index],
    }));

    // Calculate time by status
    const completedAttempts = attempts.filter(isAttemptCompleted);
    const incompleteAttempts = attempts.filter((a) => !isAttemptCompleted(a));

    const timeByStatus = {
      completed: {
        average:
          completedAttempts.length > 0 ? calculateTimeStatistics(completedAttempts).average : 0,
        total: calculateTotalTimeSpent(completedAttempts),
      },
      incomplete: {
        average:
          incompleteAttempts.length > 0 ? calculateTimeStatistics(incompleteAttempts).average : 0,
        total: calculateTotalTimeSpent(incompleteAttempts),
      },
    };

    return res.status(200).json({
      success: true,
      data: {
        packageId: pkg._id,
        packageTitle: pkg.title,
        statistics,
        distribution,
        timeByStatus,
      },
    });
  } catch (error: any) {
    console.error('Error getting time analytics:', error);
    const status = mapErrorToStatus(error);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to get time analytics',
      error: error.message,
    });
  }
};

/**
 * Get interaction data for an attempt
 * GET /api/v1/scorm/reports/interactions/:attemptId
 */
export const getInteractionData = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;

    const role = req.userAuth?.role;
    const userId = req.userAuth?._id?.toString();
    const scope = req.departmentScope?.accessibleDepartmentIds as DepartmentScope;

    const attempt = await ScormAttempt.findOne({ attemptId }).populate(
      'package',
      'department uploadedBy isGlobal'
    );
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    if (role === 'learner' && attempt.learner.toString() !== userId) {
      throw new AuthorizationError('Access denied for this attempt');
    }

    const pkg = attempt.package as any;
    if ((role === 'staff' || role === 'global-admin') && !isPackageAccessible(pkg, role, userId, scope)) {
      throw new AuthorizationError('Access denied for this package');
    }

    const cmi = attempt.cmi as any;
    const interactions = cmi.interactions || [];

    // Calculate summary
    const totalInteractions = interactions.length;
    const correctInteractions = interactions.filter(
      (i: any) => i.result === 'correct' || i.result === 'true'
    ).length;
    const incorrectInteractions = interactions.filter(
      (i: any) => i.result === 'incorrect' || i.result === 'false'
    ).length;
    const successRate =
      totalInteractions > 0 ? Math.round((correctInteractions / totalInteractions) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        attemptId,
        interactions,
        summary: {
          totalInteractions,
          correctInteractions,
          incorrectInteractions,
          successRate,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting interaction data:', error);
    const status = mapErrorToStatus(error);
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to get interaction data',
      error: error.message,
    });
  }
};

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  // Get headers
  const headers = Object.keys(data[0]);

  // Create CSV rows
  const csvRows = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ];

  return csvRows.join('\n');
}
