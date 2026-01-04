import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Program from '../../model/Academic/Program';
import ProgramLevel from '../../model/Academic/ProgramLevel';
import ProgramEnrollment from '../../model/Academic/ProgramEnrollment';
import CourseEnrollment from '../../model/Academic/CourseEnrollment';
import { AuthorizationError, ValidationError } from '../../utils/errors';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const parseWeeks = (value: unknown, defaultWeeks = 4): number => {
  if (value === undefined || value === null || value === '') return defaultWeeks;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError('weeks must be a positive number');
  }
  return Math.min(Math.floor(parsed), 52);
};

const getDepartmentFilter = (
  req: Request,
  departmentId: string | undefined
): mongoose.FilterQuery<any> => {
  const scope = req.departmentScope?.accessibleDepartmentIds;
  if (!departmentId) {
    if (!scope || scope === 'all') {
      return {};
    }
    return { department: { $in: scope.map((id) => new mongoose.Types.ObjectId(id)) } };
  }

  if (!mongoose.isValidObjectId(departmentId)) {
    throw new ValidationError('Invalid departmentId');
  }

  if (scope !== 'all' && (!scope || !scope.includes(departmentId))) {
    throw new AuthorizationError('Access denied for this department');
  }

  return { department: new mongoose.Types.ObjectId(departmentId) };
};

const buildWeeklySeries = (weeks: number, counts: Map<number, number>): number[] => {
  const series = Array.from({ length: weeks }, () => 0);
  for (const [weekIndex, count] of counts.entries()) {
    if (weekIndex >= 0 && weekIndex < weeks) {
      series[weekIndex] = count;
    }
  }
  return series;
};

export const getProgramAnalytics = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const weeks = parseWeeks(req.query.weeks);
  const windowStart = new Date(Date.now() - weeks * WEEK_MS);
  const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : undefined;

  const programFilter = getDepartmentFilter(req, departmentId);
  const programs = await Program.find(programFilter).select('_id name').lean();
  const programIds = programs.map((program) => program._id);

  if (programIds.length === 0) {
    res.status(200).json({ status: 'success', data: [] });
    return;
  }

  const enrollmentStats = await ProgramEnrollment.aggregate([
    { $match: { program: { $in: programIds } } },
    {
      $group: {
        _id: '$program',
        activeLearners: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
        },
        totalAll: { $sum: 1 },
        completedWindow: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'completed'] }, { $gte: ['$completedAt', windowStart] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const enrollmentByProgram = new Map<string, any>();
  enrollmentStats.forEach((stat) => {
    enrollmentByProgram.set(stat._id.toString(), stat);
  });

  const weeklyEnrollmentStats = await ProgramEnrollment.aggregate([
    { $match: { program: { $in: programIds }, enrolledAt: { $gte: windowStart } } },
    {
      $project: {
        program: 1,
        weekIndex: {
          $floor: {
            $divide: [{ $subtract: ['$enrolledAt', windowStart] }, WEEK_MS],
          },
        },
      },
    },
    {
      $group: {
        _id: { program: '$program', weekIndex: '$weekIndex' },
        count: { $sum: 1 },
      },
    },
  ]);

  const weeklyByProgram = new Map<string, Map<number, number>>();
  weeklyEnrollmentStats.forEach((row) => {
    const programId = row._id.program.toString();
    const weekIndex = row._id.weekIndex as number;
    const existing = weeklyByProgram.get(programId) || new Map<number, number>();
    existing.set(weekIndex, row.count);
    weeklyByProgram.set(programId, existing);
  });

  const abandonedStats = await CourseEnrollment.aggregate([
    {
      $match: {
        program: { $in: programIds },
        status: 'active',
        startedAt: { $exists: true, $ne: null },
        updatedAt: { $lt: windowStart },
      },
    },
    { $group: { _id: { program: '$program', learner: '$learner' } } },
    { $group: { _id: '$_id.program', abandonedLearners: { $sum: 1 } } },
  ]);

  const abandonedByProgram = new Map<string, number>();
  abandonedStats.forEach((row) => {
    abandonedByProgram.set(row._id.toString(), row.abandonedLearners);
  });

  const data = programs.map((program) => {
    const programId = program._id.toString();
    const stats = enrollmentByProgram.get(programId) || {};
    const totalAll = stats.totalAll || 0;
    const completedWindow = stats.completedWindow || 0;
    const abandonedWindow = abandonedByProgram.get(programId) || 0;
    const completionRate = totalAll > 0 ? completedWindow / totalAll : 0;
    const abandonmentRate = totalAll > 0 ? abandonedWindow / totalAll : 0;
    const weeklyEnrollments = buildWeeklySeries(weeks, weeklyByProgram.get(programId) || new Map());

    return {
      programId,
      programName: program.name,
      completionRate,
      abandonmentRate,
      activeLearners: stats.activeLearners || 0,
      weeklyEnrollments,
    };
  });

  res.status(200).json({ status: 'success', data });
});

export const getProgramLevelAnalytics = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const weeks = parseWeeks(req.query.weeks);
    const windowStart = new Date(Date.now() - weeks * WEEK_MS);
    const { programId } = req.params;

    if (!mongoose.isValidObjectId(programId)) {
      throw new ValidationError('Invalid programId');
    }

    const levels = await ProgramLevel.find({ program: programId }).select('_id name').lean();
    const levelIds = levels.map((level) => level._id);

    if (levelIds.length === 0) {
      res.status(200).json({ status: 'success', data: [] });
      return;
    }

    const enrollmentStats = await CourseEnrollment.aggregate([
      { $match: { programLevel: { $in: levelIds } } },
      {
        $group: {
          _id: '$programLevel',
          totalAll: { $sum: 1 },
          completedWindow: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$status', 'completed'] }, { $gte: ['$completedAt', windowStart] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const enrollmentByLevel = new Map<string, any>();
    enrollmentStats.forEach((stat) => {
      enrollmentByLevel.set(stat._id.toString(), stat);
    });

    const abandonedStats = await CourseEnrollment.aggregate([
      {
        $match: {
          programLevel: { $in: levelIds },
          status: 'active',
          startedAt: { $exists: true, $ne: null },
          updatedAt: { $lt: windowStart },
        },
      },
      { $group: { _id: { programLevel: '$programLevel', learner: '$learner' } } },
      { $group: { _id: '$_id.programLevel', abandonedLearners: { $sum: 1 } } },
    ]);

    const abandonedByLevel = new Map<string, number>();
    abandonedStats.forEach((row) => {
      abandonedByLevel.set(row._id.toString(), row.abandonedLearners);
    });

    const activeStats = await CourseEnrollment.aggregate([
      { $match: { programLevel: { $in: levelIds }, status: 'active' } },
      { $group: { _id: { programLevel: '$programLevel', learner: '$learner' } } },
      { $group: { _id: '$_id.programLevel', activeLearners: { $sum: 1 } } },
    ]);

    const activeByLevel = new Map<string, number>();
    activeStats.forEach((row) => {
      activeByLevel.set(row._id.toString(), row.activeLearners);
    });

    const weeklyStats = await CourseEnrollment.aggregate([
      { $match: { programLevel: { $in: levelIds }, startedAt: { $gte: windowStart } } },
      {
        $project: {
          programLevel: 1,
          weekIndex: {
            $floor: {
              $divide: [{ $subtract: ['$startedAt', windowStart] }, WEEK_MS],
            },
          },
        },
      },
      {
        $group: {
          _id: { programLevel: '$programLevel', weekIndex: '$weekIndex' },
          count: { $sum: 1 },
        },
      },
    ]);

    const weeklyByLevel = new Map<string, Map<number, number>>();
    weeklyStats.forEach((row) => {
      const levelId = row._id.programLevel.toString();
      const weekIndex = row._id.weekIndex as number;
      const existing = weeklyByLevel.get(levelId) || new Map<number, number>();
      existing.set(weekIndex, row.count);
      weeklyByLevel.set(levelId, existing);
    });

    const data = levels.map((level) => {
      const levelId = level._id.toString();
      const stats = enrollmentByLevel.get(levelId) || {};
      const totalAll = stats.totalAll || 0;
      const completedWindow = stats.completedWindow || 0;
      const abandonedWindow = abandonedByLevel.get(levelId) || 0;
      const completionRate = totalAll > 0 ? completedWindow / totalAll : 0;
      const abandonmentRate = totalAll > 0 ? abandonedWindow / totalAll : 0;
      const weeklyEnrollments = buildWeeklySeries(weeks, weeklyByLevel.get(levelId) || new Map());

      return {
        levelId,
        levelName: level.name,
        completionRate,
        abandonmentRate,
        activeLearners: activeByLevel.get(levelId) || 0,
        weeklyEnrollments,
      };
    });

    res.status(200).json({ status: 'success', data });
  }
);

export const getProgramLevelDetail = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { programId, levelId } = req.params;
    if (!mongoose.isValidObjectId(programId) || !mongoose.isValidObjectId(levelId)) {
      throw new ValidationError('Invalid programId or levelId');
    }

    res.status(200).json({
      status: 'success',
      data: {
        programId,
        levelId,
        courses: [],
        learners: [],
      },
    });
  }
);
