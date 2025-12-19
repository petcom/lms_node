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

/**
 * @desc    Initialize SCORM session
 * @route   POST /api/v1/scorm/runtime/:attemptId/initialize
 * @access  Private (Student)
 */
export const initializeSession = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const userId = req.userAuth!._id;

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId);

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Verify student owns this attempt
  if (attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  // Get package to determine version
  const scormPackage = await ScormPackage.findById(attempt.package);
  if (!scormPackage) {
    res.status(404);
    throw new Error('Package not found');
  }

  try {
    // Create session
    const session = await createSession(attemptId, userId);

    // Update attempt status
    (attempt as any).status = 'running';
    (attempt as any).startedAt = new Date();
    await attempt.save();

    res.status(200).json({
      success: true,
      data: {
        result: 'true',
        errorCode: '0',
        session: {
          attemptId: session.attemptId,
          startedAt: session.startedAt,
        },
      },
    });
  } catch (error: any) {
    // Already initialized
    if (error.message.includes('already initialized')) {
      res.status(200).json({
        success: false,
        data: {
          result: 'false',
          errorCode: scormPackage.version === 'scorm_1.2' ? '101' : '103',
          errorString: error.message,
        },
      });
    } else {
      throw error;
    }
  }
});

/**
 * @desc    Terminate SCORM session
 * @route   POST /api/v1/scorm/runtime/:attemptId/terminate
 * @access  Private (Student)
 */
export const terminateSessionAPI = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const userId = req.userAuth!._id;

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId);

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Verify student owns this attempt
  if (attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

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
  if (Object.keys(pendingCMI).length > 0) {
    let cmiData = (attempt as any).cmi || {};
    const scormPackage = await ScormPackage.findById(attempt.package);
    
    for (const [element, value] of Object.entries(pendingCMI)) {
      cmiData = setCMIValue(cmiData, element, value, scormPackage?.version || 'scorm_1.2');
    }
    
    (attempt as any).cmi = cmiData;
    await clearPendingCMI(attemptId);
  }

  // Update attempt status
  if ((attempt as any).status === 'running') {
    (attempt as any).status = 'suspended';
  }

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
  const userId = req.userAuth!._id;

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId)
    .populate('student', 'name email')
    .populate('package', 'version');

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Verify student owns this attempt
  if ((attempt.student as any)._id.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  const scormPackage = attempt.package as any;
  const version = scormPackage.version;

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

  // Get value from CMI data
  const cmiData = (attempt as any).cmi || {};
  const value = getCMIValue(cmiData, element, version);

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
  const userId = req.userAuth!._id;

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId)
    .populate('package', 'version');

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Verify student owns this attempt
  if (attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  const scormPackage = attempt.package as any;
  const version = scormPackage.version;

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
  await addPendingCMI(attemptId, element, value);
  await setSessionError(attemptId, '0');

  res.status(200).json({
    success: true,
    data: {
      result: 'true',
      errorCode: '0',
    },
  });
});

/**
 * @desc    Commit CMI data
 * @route   POST /api/v1/scorm/runtime/:attemptId/commit
 * @access  Private (Student)
 */
export const commitData = asyncHandler(async (req: Request, res: Response) => {
  const { attemptId } = req.params;
  const userId = req.userAuth!._id;

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId)
    .populate('package', 'version');

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Verify student owns this attempt
  if (attempt.student.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this attempt');
  }

  const scormPackage = attempt.package as any;
  const version = scormPackage.version;

  // Get pending data
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

  try {
    // Apply pending changes to CMI data
    let cmiData = (attempt as any).cmi || {};
    
    for (const [element, value] of Object.entries(pendingCMI)) {
      cmiData = setCMIValue(cmiData, element, value, version);
    }

    // Save to database
    (attempt as any).cmi = cmiData;
    
    // Log commit
    (attempt as any).sessionLog = (attempt as any).sessionLog || [];
    (attempt as any).sessionLog.push({
      timestamp: new Date(),
      event: 'data_committed',
      data: { elements: Object.keys(pendingCMI) },
    });

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
  } catch (error) {
    await setSessionError(attemptId, '391', 'General commit failure');
    res.status(500).json({
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
  const userId = req.userAuth!._id;

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId);

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Verify student owns this attempt
  if (attempt.student.toString() !== userId.toString()) {
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
  const userId = req.userAuth!._id;

  // Find attempt
  const attempt = await ScormAttempt.findById(attemptId);

  if (!attempt) {
    res.status(404);
    throw new Error('Attempt not found');
  }

  // Verify student owns this attempt
  if (attempt.student.toString() !== userId.toString()) {
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
