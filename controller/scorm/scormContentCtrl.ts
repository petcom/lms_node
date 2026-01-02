import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import ScormPackage from '../../model/Scorm/ScormPackage';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import { StorageFactory } from '../../utils/scorm/storage/StorageFactory';
import path from 'path';
import { NotFoundError } from '../../utils/errors';

/**
 * @desc    Launch SCORM package
 * @route   GET /api/scorm/content/:packageId/launch
 * @access  Private (Learner)
 */
export const launchPackage = asyncHandler(async (req: Request, res: Response) => {
  const { packageId } = req.params;
  const learnerId = req.userAuth!._id;

  // Get package
  const scormPackage = await ScormPackage.findById(packageId);

  if (!scormPackage) {
    throw new NotFoundError('SCORM package not found');
  }

  // Check if learner has access (fall back to allow when method is unavailable)
  let hasAccess = true;
  if (typeof (scormPackage as any).hasLearnerAccess === 'function') {
    hasAccess = await (scormPackage as any).hasLearnerAccess(learnerId);
  }

  if (!hasAccess) {
    res.status(403);
    throw new Error('You do not have access to this package');
  }

  // Get or create attempt
  const attempt = await ScormAttempt.getOrCreateAttempt(learnerId, scormPackage._id);

  // Check max attempts
  if (
    (scormPackage as any).maxAttempts &&
    (attempt as any).attemptNumber > (scormPackage as any).maxAttempts
  ) {
    res.status(403);
    throw new Error(`Maximum attempts (${(scormPackage as any).maxAttempts}) exceeded`);
  }

  // Generate launch URL
  const storageProvider = StorageFactory.getProvider();
  const contentUrl = storageProvider.getFileUrl(`${packageId}/${(scormPackage as any).launchUrl}`);

  const runtimeBase = `/api/v1/content/scorm/runtime/${attempt._id}`;

  // Update statistics
  await ScormPackage.updateStats(scormPackage.packageId, scormPackage._id as any);

  res.status(200).json({
    success: true,
    data: {
      packageId: scormPackage.packageId,
      title: scormPackage.title,
      version: scormPackage.version,
      launchUrl: contentUrl,
      attemptId: attempt._id,
      attemptNumber: (attempt as any).attemptNumber,
      tracking: {
        trackTime: (scormPackage as any).trackingOptions?.trackTime ?? true,
        trackScore: (scormPackage as any).trackingOptions?.trackScore ?? true,
        trackCompletion: (scormPackage as any).trackingOptions?.trackCompletion ?? true,
        trackInteractions: (scormPackage as any).trackingOptions?.trackInteractions ?? true,
        timeLimit: (scormPackage as any).trackingOptions?.timeLimit,
        allowMultipleAttempts: (scormPackage as any).trackingOptions?.allowMultipleAttempts ?? true,
        maxAttempts: (scormPackage as any).maxAttempts,
        passingScore: (scormPackage as any).passingScore,
      },
      runtime: {
        packageId: scormPackage.packageId,
        attemptId: attempt._id,
        attemptNumber: (attempt as any).attemptNumber,
        learnerId: learnerId,
        version: scormPackage.version,
        endpoints: {
          initialize: `${runtimeBase}/initialize`,
          terminate: `${runtimeBase}/terminate`,
          commit: `${runtimeBase}/commit`,
          getValue: `${runtimeBase}/value/:element`,
          setValue: `${runtimeBase}/value/:element`,
          error: `${runtimeBase}/error`,
          heartbeat: `${runtimeBase}/heartbeat`,
        },
      },
    },
  });
});

/**
 * @desc    Get SCORM content file
 * @route   GET /api/scorm/content/:packageId/*
 * @access  Private (Learner)
 */
export const getContentFile = asyncHandler(async (req: Request, res: Response) => {
  const { packageId } = req.params;
  const filePath = req.params[0]; // Capture everything after packageId
  const learnerId = req.userAuth!._id;

  // Find package
  const scormPackage = await ScormPackage.findOne({ packageId });

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  // Check if learner has access (fall back to allow when method is unavailable)
  let hasAccess = true;
  if (typeof (scormPackage as any).hasLearnerAccess === 'function') {
    hasAccess = await (scormPackage as any).hasLearnerAccess(learnerId);
  }

  if (!hasAccess) {
    res.status(403);
    throw new Error('You do not have access to this package');
  }

  try {
    // Get file from storage
    const storageProvider = StorageFactory.getProvider();
    const fullPath = path.posix.join(packageId, filePath);
    const fileBuffer = await storageProvider.readFile(fullPath);

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.htm': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.pdf': 'application/pdf',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(fileBuffer);
  } catch (error: any) {
    throw new NotFoundError('File not found');
  }
});

/**
 * @desc    Get package manifest
 * @route   GET /api/scorm/content/:packageId/manifest
 * @access  Private (Instructor/Admin)
 */
export const getManifest = asyncHandler(async (req: Request, res: Response) => {
  const { packageId } = req.params;

  const scormPackage = await ScormPackage.findOne({ packageId });

  if (!scormPackage) {
    throw new NotFoundError('SCORM package not found');
  }

  res.status(200).json({
    success: true,
    data: scormPackage.manifestData,
  });
});
