/**
 * SCORM Runtime API Controller
 * 
 * Handles server-side SCORM Runtime API calls:
 * - Initialize/Terminate sessions
 * - Get/Set CMI values
 * - Commit data
 * - Error handling
 */

import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import ScormPackage from '../../model/Scorm/ScormPackage';
import {
  validateCMIElement,
  isReadOnly,
  getCMIValue,
  setCMIValue,
  getErrorString,
} from '../../utils/scorm/cmiDataMapper';
import {
  createSession,
  getSession,
  updateHeartbeat,
  addPendingCMI,
  getPendingCMI,
  clearPendingCMI,
  setSessionError,
  getSessionError,
  terminateSession,
} from '../../utils/scorm/sessionManager';

const ensureAttemptCMIShape = (attempt: any) => {
  attempt.cmi = attempt.cmi || {};
  attempt.cmi.score = attempt.cmi.score || {};
  attempt.cmi.session_time = attempt.cmi.session_time || 'PT0H0M0S';
  attempt.cmi.total_time = attempt.cmi.total_time || 'PT0H0M0S';
};

const logInteraction = (
  attempt: any,
  action: 'Initialize' | 'GetValue' | 'SetValue' | 'Commit' | 'Terminate',
  element?: string,
  value?: any,
  errorCode?: string
) => {
  attempt.interactionLog = attempt.interactionLog || [];
  attempt.interactionLog.push({
    timestamp: new Date(),
    action,
    element,
    value,
    errorCode,
  });
};

/**
 * @desc    Initialize SCORM session
 * @route   POST /api/v1/scorm/runtime/:attemptId/initialize
 * @access  Private (Student)
 */
export const initializeSession = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const user = (req as any).userAuth;
  const userId = user?._id;
  const userRole = user?.role;

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(404);
    throw new Error('Attempt not found');
  }
  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId);

  if (!attempt) {
    res.status(404).json({ success: false, message: 'Attempt not found' });
    return;
  }

  // Get package to determine version
  const scormPackage = await ScormPackage.findById(attempt.package);
  if (!scormPackage) {
    res.status(404).json({ success: false, message: 'Package not found' });
    return;
  }

  // Allow unauthenticated/admin/teacher to bypass ownership while testing
  const skipOwnership = !user || (userRole && userRole !== 'student');

  // Verify student owns this attempt when required
  if (!skipOwnership && attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  try {
    const sessionUserId = skipOwnership
      ? ((attempt.student as any) || new mongoose.Types.ObjectId())
      : userId;

    // Create session (ignore if already initialized)
    await createSession(attemptId, sessionUserId as any);
  } catch (error: any) {
    if (!error.message.includes('already initialized')) {
      // If session creation fails, log and continue to return success for the adapter
      console.error('SCORM initialize session creation failed, continuing without persistence:', error?.message || error);
    }
  }

  ensureAttemptCMIShape(attempt as any);
  (attempt as any).status = ['passed', 'failed', 'completed'].includes((attempt as any).status)
    ? (attempt as any).status
    : 'incomplete';
  (attempt as any).startedAt = (attempt as any).startedAt || new Date();
  (attempt as any).lastAccessedAt = new Date();
  logInteraction(attempt as any, 'Initialize');
  await attempt.save();

  res.status(200).json({
    success: true,
    data: {
      result: 'true',
      errorCode: '0',
      session: {
        attemptId,
        startedAt: new Date().toISOString(),
      },
    },
  });
});

/**
 * @desc    Terminate SCORM session
 * @route   POST /api/v1/scorm/runtime/:attemptId/terminate
 * @access  Private (Student)
 */
export const terminateSessionAPI = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const user = (req as any).userAuth;
  const userId = user?._id;

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId);

  if (!attempt) {
    res.status(404).json({ success: false, message: 'Attempt not found' });
    return;
  }

  // Verify student owns this attempt
  if (userId && attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  (attempt as any).lastAccessedAt = new Date();
  await attempt.save();

  // Get session
  const session = await getSession(attemptId);
  if (!session) {
    res.status(200).json({
      success: false,
      data: {
        result: 'false',
        errorCode: '301',
        errorString: 'Not initialized',
      },
    });
    return;
  }

  // Commit any pending data
  const pendingCMI = await getPendingCMI(attemptId);
  ensureAttemptCMIShape(attempt as any);
  if (Object.keys(pendingCMI).length > 0) {
    let cmiData = (attempt as any).cmi || {};
    const scormPackage = await ScormPackage.findById(attempt.package);

    if (!scormPackage) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }
    
    for (const [element, value] of Object.entries(pendingCMI)) {
      cmiData = setCMIValue(cmiData, element, value, scormPackage?.version || 'scorm_1.2');
    }
    
    (attempt as any).cmi = cmiData;
    await clearPendingCMI(attemptId);
  }

  // Update attempt status
  (attempt as any).lastAccessedAt = new Date();
  if (!['completed', 'passed', 'failed'].includes((attempt as any).status)) {
    (attempt as any).status = 'suspended';
  }
  (attempt as any).calculateCompletion?.();
  if (['completed', 'passed', 'failed'].includes((attempt as any).status) && !(attempt as any).completedAt) {
    (attempt as any).completedAt = new Date();
  }
  logInteraction(attempt as any, 'Terminate');
  await attempt.save();

  // Terminate session
  await terminateSession(attemptId, 'normal');

  res.status(200).json({
    success: true,
    data: {
      result: 'true',
      errorCode: '0',
    },
  });
});

/**
 * @desc    Get CMI value
 * @route   GET /api/v1/scorm/runtime/:attemptId/value/:element
 * @access  Private (Student)
 */
export const getCMIValueAPI = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId, element } = req.params;
  const user = (req as any).userAuth;
  const userId = user?._id;

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId)
    .populate('student', 'name email')
    .populate('package', 'version');

  if (!attempt) {
    res.status(404).json({ success: false, message: 'Attempt not found' });
    return;
  }

  // Verify student owns this attempt
  if (userId && (attempt.student as any)._id.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  const scormPackage = attempt.package as any;
  const version = scormPackage.version;
  const pendingCMI = await getPendingCMI(attemptId);
  ensureAttemptCMIShape(attempt as any);

  // Validate element
  if (!validateCMIElement(element, version)) {
    await setSessionError(attemptId, '401', 'Undefined data model element');
    res.status(200).json({
      success: false,
      data: {
        value: '',
        errorCode: '401',
        errorString: getErrorString(401, version),
      },
    });
    return;
  }

  // Handle read-only student data
  if (element === 'cmi.core.student_id' || element === 'cmi.learner_id') {
    res.status(200).json({
      success: true,
      data: {
        value: (attempt.student as any)._id.toString(),
        errorCode: '0',
      },
    });
    return;
  }

  if (element === 'cmi.core.student_name' || element === 'cmi.learner_name') {
    res.status(200).json({
      success: true,
      data: {
        value: (attempt.student as any).name,
        errorCode: '0',
      },
    });
    return;
  }

  // Get value from pending session data first, then persisted CMI
  if (Object.prototype.hasOwnProperty.call(pendingCMI, element)) {
    res.status(200).json({
      success: true,
      data: {
        value: pendingCMI[element] || '',
        errorCode: '0',
      },
    });
    return;
  }

  const cmiData = (attempt as any).cmi || {};
  const value = getCMIValue(cmiData, element, version);
  logInteraction(attempt as any, 'GetValue', element, value);
  (attempt as any).lastAccessedAt = new Date();
  await attempt.save();

  res.status(200).json({
    success: true,
    data: {
      value: value || '',
      errorCode: '0',
    },
  });
});

/**
 * @desc    Set CMI value
 * @route   PUT /api/v1/scorm/runtime/:attemptId/value/:element
 * @access  Private (Student)
 */
export const setCMIValueAPI = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId, element } = req.params;
  const { value } = req.body;
  const user = (req as any).userAuth;
  const userId = user?._id;

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId)
    .populate('package', 'version');

  if (!attempt) {
    res.status(404).json({ success: false, message: 'Attempt not found' });
    return;
  }

  // Verify student owns this attempt
  if (userId && attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  const scormPackage = attempt.package as any;
  const version = scormPackage.version;
  ensureAttemptCMIShape(attempt as any);

  // Validate element
  if (!validateCMIElement(element, version)) {
    await setSessionError(attemptId, '401', 'Undefined data model element');
    res.status(200).json({
      success: false,
      data: {
        result: 'false',
        errorCode: '401',
        errorString: getErrorString(401, version),
      },
    });
    return;
  }

  // Check if read-only
  if (isReadOnly(element, version)) {
    await setSessionError(attemptId, version === 'scorm_1.2' ? '403' : '404', 'Element is read only');
    res.status(200).json({
      success: false,
      data: {
        result: 'false',
        errorCode: version === 'scorm_1.2' ? '403' : '404',
        errorString: getErrorString(version === 'scorm_1.2' ? 403 : 404, version),
      },
    });
    return;
  }

  // Add to pending CMI (will be committed on Commit() call)
  try {
    await addPendingCMI(attemptId, element, value);
    await setSessionError(attemptId, '0');
    (attempt as any).lastAccessedAt = new Date();
    logInteraction(attempt as any, 'SetValue', element, value, '0');
    await attempt.save();

    res.status(200).json({
      success: true,
      data: {
        result: 'true',
        errorCode: '0',
      },
    });
    return;
  } catch (error: any) {
    // Lazily create session for unauthenticated/admin flows to avoid 500s
    if (error?.message?.includes('Session not initialized')) {
      try {
        const sessionUserId = (attempt.student as any) || new mongoose.Types.ObjectId();
        await createSession(attemptId, sessionUserId as any);
        await addPendingCMI(attemptId, element, value);
        await setSessionError(attemptId, '0');
        (attempt as any).lastAccessedAt = new Date();
        logInteraction(attempt as any, 'SetValue', element, value, '0');
        await attempt.save();

        res.status(200).json({
          success: true,
          data: {
            result: 'true',
            errorCode: '0',
          },
        });
        return;
      } catch (innerError: any) {
        console.error('SCORM setCMIValue fallback failed:', innerError?.message || innerError);
      }
    } else {
      console.error('SCORM setCMIValue failed:', error?.message || error);
    }

    await setSessionError(attemptId, '101', 'General exception');
    res.status(200).json({
      success: false,
      data: {
        result: 'false',
        errorCode: '101',
        errorString: getErrorString(101, version),
      },
    });
  }
});

/**
 * @desc    Commit CMI data
 * @route   POST /api/v1/scorm/runtime/:attemptId/commit
 * @access  Private (Student)
 */
export const commitData = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const user = (req as any).userAuth;
  const userId = user?._id;

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId)
    .populate('package', 'version');

  if (!attempt) {
    res.status(404).json({ success: false, message: 'Attempt not found' });
    return;
  }

  // Verify student owns this attempt
  if (userId && attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  const scormPackage = attempt.package as any;
  const version = scormPackage.version;
  ensureAttemptCMIShape(attempt as any);

  try {
    // Get pending data (may throw if Redis not ready)
    const pendingCMI = await getPendingCMI(attemptId);

    if (Object.keys(pendingCMI).length === 0) {
      res.status(200).json({
        success: true,
        data: {
          result: 'true',
          errorCode: '0',
        },
      });
      return;
    }

    // Apply pending changes to CMI data
    let cmiData = (attempt as any).cmi || {};
    
    for (const [element, value] of Object.entries(pendingCMI)) {
      cmiData = setCMIValue(cmiData, element, value, version);
    }

    // Save to database
    (attempt as any).cmi = cmiData;
    (attempt as any).lastAccessedAt = new Date();
    (attempt as any).calculateCompletion?.();
    if (!['completed', 'passed', 'failed', 'suspended'].includes((attempt as any).status)) {
      (attempt as any).status = 'incomplete';
    }
    if (['completed', 'passed', 'failed'].includes((attempt as any).status) && !(attempt as any).completedAt) {
      (attempt as any).completedAt = new Date();
    }

    // Log commit
    (attempt as any).sessionLog = (attempt as any).sessionLog || [];
    (attempt as any).sessionLog.push({
      timestamp: new Date(),
      event: 'data_committed',
      data: { elements: Object.keys(pendingCMI) },
    });
    logInteraction(attempt as any, 'Commit');

    await attempt.save();

    // Clear pending data
    await clearPendingCMI(attemptId);
    await setSessionError(attemptId, '0');

    res.status(200).json({
      success: true,
      data: {
        result: 'true',
        errorCode: '0',
      },
    });
  } catch (error: any) {
    console.error('SCORM commit failed:', error?.message || error);
    await setSessionError(attemptId, '391', 'General commit failure');
    res.status(200).json({
      success: false,
      data: {
        result: 'false',
        errorCode: '391',
        errorString: getErrorString(391, version),
      },
    });
  }
});

/**
 * @desc    Get last error
 * @route   GET /api/v1/scorm/runtime/:attemptId/error
 * @access  Private (Student)
 */
export const getLastError = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const user = (req as any).userAuth;
  const userId = user?._id;

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Find attempt
    const attempt = await ScormAttempt.findById(attemptId);

    if (!attempt) {
      res.status(404).json({ success: false, message: 'Attempt not found' });
      return;
    }

  // Verify student owns this attempt
  if (userId && attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  const error = await getSessionError(attemptId);

  res.status(200).json({
    success: true,
    data: {
      errorCode: error.code,
      errorMessage: error.message,
    },
  });
});

/**
 * @desc    Session heartbeat
 * @route   POST /api/v1/scorm/runtime/:attemptId/heartbeat
 * @access  Private (Student)
 */
export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const user = (req as any).userAuth;
  const userId = user?._id;

  if (!mongoose.Types.ObjectId.isValid(attemptId)) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Find attempt
    const attempt = await ScormAttempt.findById(attemptId);

    if (!attempt) {
      res.status(404).json({ success: false, message: 'Attempt not found' });
      return;
    }

  // Verify student owns this attempt
  if (userId && attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  const updated = await updateHeartbeat(attemptId);

  if (!updated) {
    res.status(200).json({
      success: false,
      message: 'Session not active or not found',
      data: {
        active: false,
      },
    });
    return;
  }

  const session = await getSession(attemptId);

  res.status(200).json({
    success: true,
    data: {
      active: true,
      lastActivity: session?.lastActivity,
    },
  });
});
