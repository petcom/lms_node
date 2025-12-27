/**
 * SCORM Report Controller
 *
 * Handles tracking and reporting endpoints for SCORM content
 */

import { Request, Response } from 'express';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import ScormPackage from '../../model/Scorm/ScormPackage';
import Student from '../../model/Academic/Student';
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

/**
 * Get student progress across all SCORM packages
 * GET /api/v1/scorm/reports/student/:studentId
 */
export const getStudentProgress = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    // Get all attempts for this student
    const attempts = await ScormAttempt.find({ student: studentId })
      .populate('package')
      .sort({ startedAt: -1 });

    // Get student info
    const student = await Student.findById(studentId).select('firstName lastName email');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Group attempts by package
    const packageMap = new Map();

    attempts.forEach((attempt) => {
      const pkg = attempt.package as any;
      if (!pkg) return;

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

    return res.status(200).json({
      success: true,
      data: {
        studentId: student._id,
        studentName: `${(student as any).firstName} ${(student as any).lastName}`,
        studentEmail: (student as any).email,
        packages,
        summary: {
          totalPackages,
          completedPackages,
          averageScore,
          totalTimeSpent,
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting student progress:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get student progress',
      error: error.message,
    });
  }
};

/**
 * Get package analytics for teachers
 * GET /api/v1/scorm/reports/package/:packageId/analytics
 */
export const getPackageAnalytics = async (req: Request, res: Response) => {
  try {
    const { packageId } = req.params;
    const { startDate, endDate } = req.query;

    // Get package
    const pkg = await ScormPackage.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    // Build query for attempts
    const query: any = { package: packageId };

    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate as string);
      if (endDate) query.startedAt.$lte = new Date(endDate as string);
    }

    // Get all attempts for this package
    const attempts = await ScormAttempt.find(query)
      .populate('student', 'firstName lastName email')
      .sort({ startedAt: -1 });

    // Get unique students
    const studentIds = [...new Set(attempts.map((a) => (a.student as any)._id.toString()))];
    const totalStudents = studentIds.length;
    const studentsStarted = studentIds.length;

    // Calculate completion metrics
    const completedAttempts = attempts.filter(isAttemptCompleted);
    const studentsCompleted = [
      ...new Set(completedAttempts.map((a) => (a.student as any)._id.toString())),
    ].length;
    const completionRate = calculateCompletionRate(studentsStarted, studentsCompleted);

    // Calculate score and time metrics
    const attemptsWithScores = attempts.filter((a) => getAttemptScore(a) !== null);
    const averageScore = calculateAverageScore(attemptsWithScores);
    const averageTimeSpent =
      attemptsWithScores.length > 0
        ? Math.round(calculateTotalTimeSpent(attemptsWithScores) / attemptsWithScores.length)
        : 0;

    // Calculate pass rate
    const passedAttempts = attempts.filter((a) => isAttemptPassed(a, pkg));
    const passRate =
      attemptsWithScores.length > 0
        ? Math.round((passedAttempts.length / attemptsWithScores.length) * 100)
        : 0;

    // Group by student
    const studentMap = new Map();

    attempts.forEach((attempt) => {
      const student = attempt.student as any;
      if (!student) return;

      const studentId = student._id.toString();

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName}`,
          studentEmail: student.email,
          attempts: [],
        });
      }

      studentMap.get(studentId).attempts.push(attempt);
    });

    // Calculate per-student metrics
    const students = Array.from(studentMap.values()).map((student) => {
      const studentAttempts = student.attempts;
      const bestScore = calculateBestScore(studentAttempts);
      const avgScore = calculateAverageScore(studentAttempts);
      const timeSpent = calculateTotalTimeSpent(studentAttempts);
      const completed = studentAttempts.some(isAttemptCompleted);
      const status = completed ? 'completed' : 'in_progress';
      const lastAccessed = studentAttempts[0]?.lastAccessedAt;
      const firstAccessed = studentAttempts[studentAttempts.length - 1]?.startedAt;

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        studentEmail: student.studentEmail,
        attempts: studentAttempts.length,
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
    const timeDistribution = aggregateTimeDistribution(attempts);

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
          totalStudents,
          studentsStarted,
          studentsCompleted,
          completionRate,
          averageScore,
          averageTimeSpent,
          passRate,
        },
        students,
        scoreDistribution,
        timeDistribution,
      },
    });
  } catch (error: any) {
    console.error('Error getting package analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get package analytics',
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

    const attempt = await ScormAttempt.findOne({ attemptId })
      .populate('student', 'firstName lastName email')
      .populate('package', 'title version manifest');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    const student = attempt.student as any;
    const pkg = attempt.package as any;

    return res.status(200).json({
      success: true,
      data: {
        attemptId: attempt.attemptId,
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email,
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
    return res.status(500).json({
      success: false,
      message: 'Failed to get attempt details',
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
    const { packageId, studentId, startDate, endDate, format = 'json' } = req.query;

    // Build query
    const query: any = {};
    if (packageId) query.package = packageId;
    if (studentId) query.student = studentId;
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate as string);
      if (endDate) query.startedAt.$lte = new Date(endDate as string);
    }

    // Get attempts
    const attempts = await ScormAttempt.find(query)
      .populate('student', 'firstName lastName email')
      .populate('package', 'title version')
      .sort({ startedAt: -1 });

    // Prepare export data
    const exportData = attempts.map((attempt) => {
      const student = attempt.student as any;
      const pkg = attempt.package as any;
      const score = getAttemptScore(attempt);
      const timeSpent = calculateTotalTimeSpent([attempt]);
      const cmi = attempt.cmi as any;

      return {
        studentId: student._id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.email,
        packageId: pkg._id,
        packageTitle: pkg.title,
        packageVersion: pkg.version,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        lastAccessedAt: attempt.lastAccessedAt,
        status: attempt.status,
        score,
        timeSpent: formatTimeForDisplay(timeSpent),
        completionStatus: cmi.completion_status || cmi.lesson_status || 'unknown',
        successStatus:
          cmi.success_status || (cmi.lesson_status === 'passed' ? 'passed' : 'unknown'),
      };
    });

    // Format output based on requested format
    if (format === 'csv') {
      // CSV format
      const csv = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="scorm-export-${Date.now()}.csv"`);
      return res.send(csv);
    } else if (format === 'xlsx') {
      // Excel format - would need exceljs library
      return res.status(501).json({
        success: false,
        message: 'Excel export not yet implemented. Use CSV or JSON format.',
      });
    } else {
      // JSON format (default)
      const jsonExport = {
        exportDate: new Date().toISOString(),
        filters: { packageId, studentId, startDate, endDate },
        totalRecords: exportData.length,
        data: exportData,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="scorm-export-${Date.now()}.json"`
      );
      return res.json(jsonExport);
    }
  } catch (error: any) {
    console.error('Error exporting tracking data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export tracking data',
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

    const pkg = await ScormPackage.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    // Build query
    const query: any = { package: packageId };
    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate as string);
      if (endDate) query.startedAt.$lte = new Date(endDate as string);
    }

    const attempts = await ScormAttempt.find(query);

    // Calculate overall metrics
    const uniqueStudents = [...new Set(attempts.map((a) => a.student.toString()))];
    const completedStudents = [
      ...new Set(attempts.filter(isAttemptCompleted).map((a) => a.student.toString())),
    ];

    const overall = {
      totalStudents: uniqueStudents.length,
      completedStudents: completedStudents.length,
      completionRate: calculateCompletionRate(uniqueStudents.length, completedStudents.length),
    };

    // Group by time period (simplified - just return overall for now)
    const timeline = [
      {
        period: 'overall',
        started: uniqueStudents.length,
        completed: completedStudents.length,
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
    return res.status(500).json({
      success: false,
      message: 'Failed to get completion rates',
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

    const pkg = await ScormPackage.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    const attempts = await ScormAttempt.find({ package: packageId });
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
    return res.status(500).json({
      success: false,
      message: 'Failed to get score distribution',
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

    const pkg = await ScormPackage.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    const attempts = await ScormAttempt.find({ package: packageId });

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
    return res.status(500).json({
      success: false,
      message: 'Failed to get time analytics',
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

    const attempt = await ScormAttempt.findOne({ attemptId });
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
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
    return res.status(500).json({
      success: false,
      message: 'Failed to get interaction data',
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
