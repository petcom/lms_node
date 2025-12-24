import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import ScormPackage from '../../model/Scorm/ScormPackage';
import { PackageValidator } from '../../utils/scorm/packageValidator';
import { ManifestParser } from '../../utils/scorm/manifestParser';
import { ScormZipExtractor } from '../../utils/scorm/scormZipExtractor';
import { v4 as uuidv4 } from 'uuid';

/**
 * @desc    Upload a new SCORM package
 * @route   POST /api/scorm/packages
 * @access  Private (Teacher/Admin)
 */
export const uploadPackage = asyncHandler(async (req: Request, res: Response) => {
  // Check if file was uploaded
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload a SCORM package file');
  }

  const { title, description, subjectId, programId, classLevelId } = req.body;
  const { originalname, size } = req.file;

  // Validate the package
  const validator = new PackageValidator();
  const validationResult = await validator.validatePackage(req.file.buffer);

  if (!validationResult.isValid) {
    res.status(400);
    throw new Error(`Invalid SCORM package: ${validationResult.errors.join(', ')}`);
  }

  // Generate unique package ID
  const packageId = uuidv4();

  try {
    // Extract package
    const extractor = new ScormZipExtractor();
    await extractor.extract(req.file.buffer, packageId);

    // Parse manifest
    const manifestContent = await extractor.getManifestContent(packageId);
    const parser = new ManifestParser();
    const rawManifest = await parser.parse(manifestContent);

    // Normalize manifest resources to match schema expectations (objects with string arrays only)
    const rawResources = Array.isArray(rawManifest.resources) ? rawManifest.resources : [];
    const normalizedResources = rawResources
      .filter((r) => r && typeof r === 'object')
      .map((r: any) => ({
        identifier: r.identifier || '',
        type: r.type || '',
        href: r.href || '',
        scormType: r.scormType || '',
        dependencies: Array.isArray(r.dependencies)
          ? r.dependencies.filter(Boolean).map(String)
          : [],
        files: Array.isArray(r.files) ? r.files.filter(Boolean).map(String) : [],
      }));

    // Deep-clone resources to plain JSON so Mongoose does not attempt to cast strings
    const manifestData = {
      identifier: rawManifest.identifier,
      version: rawManifest.version || validationResult.version,
      organizations: rawManifest.organizations || [],
      resources: normalizedResources,
      metadata: rawManifest.metadata,
    };

    const version = validationResult.version || manifestData.version || 'scorm_1.2';

    // Get launch URL
    const launchUrl = parser.getLaunchUrl(manifestData);

    // Get storage provider for URL generation
    // const storageProvider = StorageFactory.getProvider();
    // const packagePath = `${packageId}/${launchUrl}`;

    // Create database record with required fields from schema
    const scormPackage = await ScormPackage.create({
      packageId,
      title: title || manifestData.metadata?.title || 'Untitled SCORM Package',
      description: description || manifestData.metadata?.description,
      version,
      identifier: manifestData.identifier,
      manifestData,
      launchUrl,
      entryPoint: launchUrl,
      fileName: originalname,
      fileSize: size,
      filePath: packageId,
      createdBy: req.userAuth!._id,
      packageSize: validationResult.packageSize,
      uploadedBy: req.userAuth!._id,
      subject: subjectId || null,
      program: programId || null,
      classLevel: classLevelId || null,
      isPublished: false,
      storageProvider: process.env.SCORM_STORAGE_PROVIDER || 'local',
      storagePath: packageId,
    });

    res.status(201).json({
      success: true,
      message: 'SCORM package uploaded successfully',
      data: scormPackage,
      warnings: validationResult.warnings,
    });
  } catch (error: any) {
    // Clean up on failure
    try {
      const extractor = new ScormZipExtractor();
      await extractor.deletePackage(packageId);
    } catch (cleanupError) {
      console.error('Failed to cleanup package:', cleanupError);
    }
    throw error;
  }
});

/**
 * @desc    Get all SCORM packages
 * @route   GET /api/scorm/packages
 * @access  Private (Teacher/Admin)
 */
export const getAllPackages = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    subject,
    program,
    classLevel,
    isPublished,
    search,
  } = req.query;

  const query: any = {};

  // Filter by subject
  if (subject) {
    query.subject = subject;
  }

  // Filter by program
  if (program) {
    query.program = program;
  }

  // Filter by class level
  if (classLevel) {
    query.classLevel = classLevel;
  }

  // Filter by published status
  if (isPublished !== undefined) {
    query.isPublished = isPublished === 'true';
  }

  // Search by title or description
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const packages = await ScormPackage.find(query)
    .populate('uploadedBy', 'name email')
    .populate('subject', 'name')
    .populate('program', 'name')
    .populate('classLevel', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await ScormPackage.countDocuments(query);

  res.status(200).json({
    success: true,
    data: packages,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * @desc    Get single SCORM package
 * @route   GET /api/scorm/packages/:id
 * @access  Private
 */
export const getPackage = asyncHandler(async (req: Request, res: Response) => {
  const scormPackage = await ScormPackage.findById(req.params.id)
    .populate('uploadedBy', 'name email')
    .populate('subject', 'name')
    .populate('program', 'name')
    .populate('classLevel', 'name')
    .populate('assignedStudents', 'name email')
    .populate('assignedClasses', 'name')
    .populate('assignedPrograms', 'name');

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  res.status(200).json({
    success: true,
    data: scormPackage,
  });
});

/**
 * @desc    Update SCORM package
 * @route   PUT /api/scorm/packages/:id
 * @access  Private (Teacher/Admin)
 */
export const updatePackage = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    isPublished,
    subject,
    program,
    classLevel,
    requiredScore,
    passingScore,
    maxAttempts,
  } = req.body;

  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  // Update fields
  if (title) scormPackage.title = title;
  if (description !== undefined) (scormPackage as any).description = description;
  if (isPublished !== undefined) (scormPackage as any).isPublished = isPublished;
  if (subject !== undefined) (scormPackage as any).subject = subject;
  if (program !== undefined) (scormPackage as any).program = program;
  if (classLevel !== undefined) (scormPackage as any).classLevel = classLevel;
  if (requiredScore !== undefined) (scormPackage as any).requiredScore = requiredScore;
  if (passingScore !== undefined) (scormPackage as any).passingScore = passingScore;
  if (maxAttempts !== undefined) (scormPackage as any).maxAttempts = maxAttempts;

  await scormPackage.save();

  res.status(200).json({
    success: true,
    message: 'Package updated successfully',
    data: scormPackage,
  });
});

/**
 * @desc    Delete SCORM package
 * @route   DELETE /api/scorm/packages/:id
 * @access  Private (Teacher/Admin)
 */
export const deletePackage = asyncHandler(async (req: Request, res: Response) => {
  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  // Delete from storage
  try {
    const extractor = new ScormZipExtractor();
    await extractor.deletePackage(scormPackage.packageId);
  } catch (error) {
    console.error('Failed to delete package from storage:', error);
  }

  // Delete from database
  await scormPackage.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Package deleted successfully',
  });
});

/**
 * @desc    Assign package to students
 * @route   POST /api/scorm/packages/:id/assign
 * @access  Private (Teacher/Admin)
 */
export const assignPackage = asyncHandler(async (req: Request, res: Response) => {
  const { studentIds, classIds, programIds } = req.body;

  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  // Add students
  if (studentIds && Array.isArray(studentIds)) {
    (scormPackage as any).assignedStudents = [
      ...new Set([...(scormPackage as any).assignedStudents, ...studentIds]),
    ];
  }

  // Add classes
  if (classIds && Array.isArray(classIds)) {
    (scormPackage as any).assignedClasses = [
      ...new Set([...(scormPackage as any).assignedClasses, ...classIds]),
    ];
  }

  // Add programs
  if (programIds && Array.isArray(programIds)) {
    (scormPackage as any).assignedPrograms = [
      ...new Set([...(scormPackage as any).assignedPrograms, ...programIds]),
    ];
  }

  await scormPackage.save();

  res.status(200).json({
    success: true,
    message: 'Package assigned successfully',
    data: scormPackage,
  });
});

/**
 * @desc    Unassign package from students
 * @route   POST /api/scorm/packages/:id/unassign
 * @access  Private (Teacher/Admin)
 */
export const unassignPackage = asyncHandler(async (req: Request, res: Response) => {
  const { studentIds, classIds, programIds } = req.body;

  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  // Remove students
  if (studentIds && Array.isArray(studentIds)) {
    (scormPackage as any).assignedStudents = (scormPackage as any).assignedStudents.filter(
      (id: any) => !studentIds.includes(id.toString())
    );
  }

  // Remove classes
  if (classIds && Array.isArray(classIds)) {
    (scormPackage as any).assignedClasses = (scormPackage as any).assignedClasses.filter(
      (id: any) => !classIds.includes(id.toString())
    );
  }

  // Remove programs
  if (programIds && Array.isArray(programIds)) {
    (scormPackage as any).assignedPrograms = (scormPackage as any).assignedPrograms.filter(
      (id: any) => !programIds.includes(id.toString())
    );
  }

  await scormPackage.save();

  res.status(200).json({
    success: true,
    message: 'Package unassigned successfully',
    data: scormPackage,
  });
});

/**
 * @desc    Get packages assigned to current student
 * @route   GET /api/scorm/packages/my-assignments
 * @access  Private (Student)
 */
export const getMyAssignments = asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.userAuth!._id;

  // Find packages assigned directly or through class/program
  const packages = await ScormPackage.findAssignedToStudent(studentId);

  res.status(200).json({
    success: true,
    data: packages,
  });
});
