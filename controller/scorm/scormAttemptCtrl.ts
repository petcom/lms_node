import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import ScormPackage from '../../model/Scorm/ScormPackage';
import { NotFoundError } from '../../utils/errors';
import { normalizePage, resolvePagination } from '../../utils/pagination';

/**
 * @desc    Get learner's attempts for a package
 * @route   GET /api/scorm/attempts/package/:packageId
 * @access  Private (Learner)
 */
export const getAttemptsByPackage = asyncHandler(async (req: Request, res: Response) => {
  const { packageId } = req.params;
  const learnerId = req.userAuth!._id;

  // Find package
  const scormPackage = await ScormPackage.findOne({
    $or: [{ packageId }, { _id: packageId }],
  });

  if (!scormPackage) {
    throw new NotFoundError('SCORM package not found');
  }

  // Get all attempts
  const attempts = await ScormAttempt.find({
    package: scormPackage._id,
    learner: learnerId,
  })
    .sort({ attemptNumber: -1 })
    .select('-cmiData -rawCMI'); // Exclude large data fields

  res.status(200).json({
    success: true,
    data: attempts,
  });
});

/**
 * @desc    Get single attempt details
 * @route   GET /api/scorm/attempts/:attemptId
 * @access  Private (Learner/Instructor/Admin)
 */
export const getAttempt = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;

  const attempt = await ScormAttempt.findById(attemptId).populate(
    'package',
    'title version packageId'
  );

  if (!attempt) {
    throw new NotFoundError('Attempt not found');
  }

  // Check authorization
  const userId = req.userAuth!._id;
  const userRole = req.userAuth!.role;

  const learnerRef = (attempt.learner as any)?._id || attempt.learner;

  if (
    learnerRef &&
    learnerRef.toString() !== userId.toString() &&
    userRole !== 'staff' &&
    userRole !== 'global-admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to view this attempt');
  }

  res.status(200).json({
    success: true,
    data: attempt,
  });
});

/**
 * @desc    Update CMI data
 * @route   PUT /api/scorm/attempts/:attemptId/cmi
 * @access  Private (Learner)
 */
export const updateCMI = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { element, value } = req.body;

  if (!element || value === undefined) {
    res.status(400);
    throw new Error('Element and value are required');
  }

  const attempt = await ScormAttempt.findById(attemptId);

  if (!attempt) {
    throw new NotFoundError('Attempt not found');
  }

  // Verify learner owns this attempt
  if (attempt.learner.toString() !== req.userAuth!._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this attempt');
  }

  // Update CMI data
  (attempt as any).setCMIValue(element, value);

  // Log the interaction
  (attempt as any).interactionLog = (attempt as any).interactionLog || [];
  (attempt as any).interactionLog.push({
    timestamp: new Date(),
    action: 'SetValue',
    element,
    value,
  });

  await attempt.save();

  res.status(200).json({
    success: true,
    message: 'CMI data updated',
    data: {
      element,
      value,
    },
  });
});

/**
 * @desc    Get CMI data
 * @route   GET /api/scorm/attempts/:attemptId/cmi/:element
 * @access  Private (Learner)
 */
export const getCMI = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId, element } = req.params;

  const attempt = await ScormAttempt.findById(attemptId);

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Verify learner owns this attempt
  if (attempt.learner.toString() !== req.userAuth!._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  const value = (attempt as any).getCMIValue(element);

  res.status(200).json({
    success: true,
    data: {
      element,
      value,
    },
  });
});

/**
 * @desc    Complete attempt
 * @route   POST /api/scorm/attempts/:attemptId/complete
 * @access  Private (Learner)
 */
export const completeAttempt = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const { score, status } = req.body;

  const attempt = await ScormAttempt.findById(attemptId).populate('package');

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Verify learner owns this attempt
  if (attempt.learner.toString() !== req.userAuth!._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to complete this attempt');
  }

  // Update completion data
  if (score !== undefined) {
    (attempt as any).score = {
      raw: score.raw || 0,
      min: score.min || 0,
      max: score.max || 100,
      scaled: score.scaled || score.raw / (score.max || 100),
    };
  }

  if (status) {
    (attempt as any).completionStatus = status;
  }

  (attempt as any).completedAt = new Date();
  (attempt as any).totalTime = Math.floor(
    ((attempt as any).completedAt.getTime() - (attempt as any).startedAt.getTime()) / 1000
  );

  // Calculate completion percentage
  (attempt as any).completionPercentage = (attempt as any).calculateCompletion();

  // Log completion
  (attempt as any).interactionLog = (attempt as any).interactionLog || [];
  (attempt as any).interactionLog.push({
    timestamp: new Date(),
    action: 'Terminate',
    element: 'attempt_completed',
    value: {
      score: (attempt as any).score,
      status: (attempt as any).completionStatus,
      duration: (attempt as any).totalTime,
    },
  });

  await attempt.save();

  // Update package statistics
  const scormPackage = attempt.package as any;
  await ScormPackage.updateStats(scormPackage.packageId, scormPackage._id as any);

  res.status(200).json({
    success: true,
    message: 'Attempt completed',
    data: attempt,
  });
});

/**
 * @desc    Get all attempts (Admin/Instructor)
 * @route   GET /api/scorm/attempts
 * @access  Private (Instructor/Admin)
 */
export const getAllAttempts = asyncHandler(async (req: Request, res: Response) => {
  const { packageId, learnerId, status } = req.query;
  const page = normalizePage(req.query.page);
  const { limit } = await resolvePagination('scormAttempts', req.query.limit);

  const query: any = {};

  if (packageId) {
    const scormPackage = await ScormPackage.findOne({ packageId });
    if (scormPackage) {
      query.package = scormPackage._id;
    }
  }

  if (learnerId) {
    query.learner = learnerId;
  }

  if (status) {
    query.completionStatus = status;
  }

  const skip = (page - 1) * limit;

  const attempts = await ScormAttempt.find(query)
    .populate('package', 'title version packageId')
    .populate('learner', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-cmiData -rawCMI -sessionLog'); // Exclude large fields

  const total = await ScormAttempt.countDocuments(query);

  res.status(200).json({
    success: true,
    data: attempts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc    Get learner progress summary
 * @route   GET /api/scorm/attempts/learner/:learnerId/summary
 * @access  Private (Instructor/Admin)
 */
export const getLearnerProgress = asyncHandler(async (req: Request, res: Response) => {
  const { learnerId } = req.params;

  const attempts = await ScormAttempt.find({ learner: learnerId })
    .populate('package', 'title version packageId')
    .select('-cmiData -rawCMI -sessionLog')
    .sort({ createdAt: -1 });

  const summary = {
    totalAttempts: attempts.length,
    completed: attempts.filter((a) => (a as any).completionStatus === 'completed').length,
    passed: attempts.filter((a) => (a as any).completionStatus === 'passed').length,
    failed: attempts.filter((a) => (a as any).completionStatus === 'failed').length,
    inProgress: attempts.filter((a) => (a as any).completionStatus === 'incomplete').length,
    averageScore: 0,
    totalTimeSpent: 0,
  };

  // Calculate averages
  const completedAttempts = attempts.filter((a) => (a as any).score && (a as any).score.scaled);
  if (completedAttempts.length > 0) {
    summary.averageScore =
      completedAttempts.reduce((sum, a) => sum + ((a as any).score?.scaled || 0), 0) /
      completedAttempts.length;
  }

  summary.totalTimeSpent = attempts.reduce((sum, a) => sum + ((a as any).totalTime || 0), 0);

  res.status(200).json({
    success: true,
    data: {
      summary,
      attempts,
    },
  });
});
