import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import ScormPackage from '../../model/Scorm/ScormPackage';
import { PackageValidator } from '../../utils/scorm/packageValidator';
import { ManifestParser } from '../../utils/scorm/manifestParser';
import { ScormZipExtractor } from '../../utils/scorm/scormZipExtractor';
import { v4 as uuidv4 } from 'uuid';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';
import logger from '../../utils/logger';
import mongoose from 'mongoose';

const isPackageInScope = (pkg: any, scope: string[] | 'all' | undefined): boolean => {
  if (pkg?.isGlobal) return true;
  if (!scope || scope === 'all') return true;
  const dept = pkg?.department?.toString?.();
  return !!dept && scope.includes(dept);
};

/**
 * @desc    Upload a new SCORM package
 * @route   POST /api/scorm/packages
 * @access  Private (Instructor/Admin)
 */
export const uploadPackage = asyncHandler(async (req: Request, res: Response) => {
  // Check if file was uploaded
  if (!req.file) {
    throw new ValidationError('Please upload a SCORM package file');
  }

  const maxUploadBytes = Number(process.env.SCORM_MAX_FILE_SIZE) || 500 * 1024 * 1024;
  const {
    title,
    description,
    course,
    courseId,
    program,
    programId,
    programLevel,
    programLevelId,
    isGraded,
    maxScore,
    dueDate,
    department,
    isGlobal,
  } = req.body as any;
  const { originalname, size } = req.file;

  if (!title) {
    throw new ValidationError('Title is required');
  }

  if (size > maxUploadBytes) {
    const err = new ValidationError('Uploaded file exceeds maximum allowed size');
    (err as any).statusCode = 413;
    throw err;
  }

  // Validate the package
  const validator = new PackageValidator();
  const validationResult = await validator.validatePackage(req.file.buffer);

  if (!validationResult.isValid) {
    const message = validationResult.errors.join(', ');
    if (message.toLowerCase().includes('exceeds maximum allowed size')) {
      const err = new ValidationError(message);
      (err as any).statusCode = 413;
      throw err;
    }
    throw new ValidationError(`Invalid SCORM package: ${message}`);
  }

  let parsedDueDate: Date | undefined;
  if (dueDate) {
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError('Invalid dueDate');
    }
    parsedDueDate = parsed;
  }

  const parsedIsGraded =
    typeof isGraded === 'string' ? isGraded.toLowerCase() !== 'false' : isGraded !== false;
  const parsedMaxScore = maxScore !== undefined ? Number(maxScore) : undefined;
  if (parsedMaxScore !== undefined && Number.isNaN(parsedMaxScore)) {
    throw new ValidationError('Invalid maxScore');
  }

  const parsedIsGlobal =
    req.userAuth?.role === 'global-admin' ? Boolean(isGlobal === 'true' || isGlobal === true) : false;

  // Generate unique package ID
  const packageId = uuidv4();

  const roleModelMap: Record<string, 'Admin' | 'Staff' | 'Learner'> = {
    'global-admin': 'Admin',
    staff: 'Staff',
    learner: 'Learner',
  };
  const uploadedByModel = roleModelMap[req.userAuth?.role || 'staff'] || 'Staff';

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

    const masterDepartmentId = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';
    const chosenDepartment =
      (req.userAuth?.role === 'global-admin' && department) ||
      (req.userAuth as any)?.department ||
      masterDepartmentId;

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
      uploadedByModel,
      course: course || courseId || null,
      program: program || programId || null,
      programLevel: programLevel || programLevelId || null,
      department: chosenDepartment ? new mongoose.Types.ObjectId(chosenDepartment) : undefined,
      isGraded: parsedIsGraded,
      maxScore: parsedMaxScore !== undefined ? parsedMaxScore : 100,
      dueDate: parsedDueDate,
      isGlobal: parsedIsGlobal,
      isPublished: false,
      storageProvider: process.env.SCORM_STORAGE_PROVIDER || 'local',
      storagePath: packageId,
    });

    res.status(201).json({
      success: true,
      message: 'SCORM package uploaded successfully',
      data: {
        id: scormPackage._id?.toString?.(),
        packageId: scormPackage.packageId,
        title: scormPackage.title,
        status: scormPackage.status,
        isPublished: scormPackage.isPublished,
        version: scormPackage.version,
        launchUrl: scormPackage.launchUrl,
        fileSize: scormPackage.fileSize,
        updatedAt: scormPackage.updatedAt,
        createdAt: scormPackage.createdAt,
        uploadedBy: scormPackage.uploadedBy,
        department: scormPackage.department,
        isGlobal: scormPackage.isGlobal,
      },
      warnings: validationResult.warnings,
    });

    logger.info('SCORM package uploaded', {
      packageId: scormPackage.packageId,
      uploadedBy: scormPackage.uploadedBy,
      uploadedByRole: req.userAuth?.role,
      fileName: scormPackage.fileName,
      fileSize: scormPackage.fileSize,
      storageProvider: (scormPackage as any).storageProvider,
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
 * @access  Private (Instructor/Admin)
 */
export const getAllPackages = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    course,
    program,
    programLevel,
    isPublished,
    status,
    search,
    department,
    owner,
  } = req.query;

  const query: any = {};

  const role = req.userAuth?.role;
  const userId = req.userAuth?._id?.toString();

  // Department scoping
  const scope = req.departmentScope?.accessibleDepartmentIds;

  // Filter by course
  if (course) {
    query.course = course;
  }

  // Filter by program
  if (program) {
    query.program = program;
  }

  // Filter by program level
  if (programLevel) {
    query.programLevel = programLevel;
  }

  // Filter by published status
  if (isPublished !== undefined) {
    query.isPublished = isPublished === 'true';
  }

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Search by title or description
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Owner filter
  if (owner) {
    const ownerValue = owner === 'me' ? userId : String(owner);
    if (!ownerValue || !mongoose.isValidObjectId(ownerValue)) {
      throw new ValidationError('Invalid owner');
    }
    if (role === 'staff' && ownerValue !== userId) {
      throw new AuthorizationError('Access denied for this owner filter');
    }
    query.uploadedBy = new mongoose.Types.ObjectId(ownerValue);
  }

  if (scope && scope !== 'all') {
    query.$and = query.$and || [];
    query.$and.push({ $or: [{ department: { $in: scope } }, { isGlobal: true }] });
  } else if (scope === 'all' && department) {
    if (!mongoose.isValidObjectId(department as any)) {
      throw new ValidationError('Invalid department query parameter');
    }
    query.department = new mongoose.Types.ObjectId(department as any);
  }

  // Staff registry scoping: only own packages or global, plus optional department scope
  if (role === 'staff' && userId) {
    const staffScope: any = {
      $or: [{ uploadedBy: new mongoose.Types.ObjectId(userId) }, { isGlobal: true }],
    };
    if (scope && scope !== 'all') {
      staffScope.$or.push({ department: { $in: scope } });
    }
    query.$and = query.$and || [];
    query.$and.push(staffScope);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const packages = await ScormPackage.find(query)
    .populate({ path: 'uploadedBy', select: 'name email role' })
    .populate('course', 'title')
    .populate('program', 'name')
    .populate('programLevel', 'name')
    .populate('assignedTo.learners', 'name email')
    .populate('assignedTo.classes', 'name')
    .populate('assignedTo.programs', 'name')
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
    .populate({ path: 'uploadedBy', select: 'name email role' })
    .populate('course', 'title')
    .populate('program', 'name')
    .populate('programLevel', 'name')
    .populate('assignedTo.learners', 'name email')
    .populate('assignedTo.classes', 'name')
    .populate('assignedTo.programs', 'name');

  if (!scormPackage) {
    throw new NotFoundError('SCORM package not found');
  }

  const scope = req.departmentScope?.accessibleDepartmentIds;
  if (scope && scope !== 'all') {
    const pkgDept = scormPackage.department?.toString();
    if (!scormPackage.isGlobal && (!pkgDept || !scope.includes(pkgDept))) {
      throw new AuthorizationError('Access to this package is not permitted for your department');
    }
  }

  res.status(200).json({
    success: true,
    data: scormPackage,
  });
});

/**
 * @desc    Update SCORM package
 * @route   PUT /api/scorm/packages/:id
 * @access  Private (Instructor/Admin)
 */
export const updatePackage = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    isPublished,
    course,
    program,
    programLevel,
    requiredScore,
    passingScore,
    maxAttempts,
  } = req.body;

  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  const scope = req.departmentScope?.accessibleDepartmentIds;
  if (!isPackageInScope(scormPackage, scope)) {
    throw new AuthorizationError('Access to this package is not permitted for your department');
  }

  // Update fields
  if (title) scormPackage.title = title;
  if (description !== undefined) (scormPackage as any).description = description;
  if (isPublished !== undefined) (scormPackage as any).isPublished = isPublished;
  if (course !== undefined) (scormPackage as any).course = course;
  if (program !== undefined) (scormPackage as any).program = program;
  if (programLevel !== undefined) (scormPackage as any).programLevel = programLevel;
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
 * @access  Private (Instructor/Admin)
 */
export const deletePackage = asyncHandler(async (req: Request, res: Response) => {
  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  const scope = req.departmentScope?.accessibleDepartmentIds;
  if (!isPackageInScope(scormPackage, scope)) {
    throw new AuthorizationError('Access to this package is not permitted for your department');
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
 * @desc    Clone a global SCORM package into a department
 * @route   POST /api/scorm/packages/:id/clone
 * @access  Private (Admin only)
 */
export const clonePackage = asyncHandler(
  async (req: Request<{ id: string }, {}, { department?: string }>, res: Response) => {
    if (req.userAuth?.role !== 'global-admin') {
      throw new AuthorizationError('Only admins can clone packages');
    }

    const targetDept = req.body.department || (req.userAuth as any)?.department?.toString();
    if (!targetDept || !mongoose.isValidObjectId(targetDept)) {
      throw new ValidationError('Target department is required and must be valid');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all' && !scope.includes(targetDept)) {
      throw new AuthorizationError('Access denied for target department');
    }

    const source = await ScormPackage.findById(req.params.id);
    if (!source) {
      throw new NotFoundError('SCORM package not found');
    }

    if (!source.isGlobal) {
      throw new AuthorizationError('Only global packages can be cloned');
    }

    const newPackageId = uuidv4();

    const sourceAny: any = source;

    const clone = await ScormPackage.create({
      packageId: newPackageId,
      title: source.title,
      description: (source as any).description,
      version: source.version,
      manifestData: source.manifestData,
      launchUrl: source.launchUrl,
      entryPoint: source.entryPoint,
      fileName: source.fileName,
      fileSize: source.fileSize,
      filePath: source.filePath,
      storagePath: sourceAny.storagePath,
      storageProvider: sourceAny.storageProvider,
      course: source.course,
      program: source.program,
      programLevel: source.programLevel,
      department: new mongoose.Types.ObjectId(targetDept),
      createdBy: req.userAuth!._id,
      uploadedBy: req.userAuth!._id,
      uploadedByModel: 'Admin',
      status: 'draft',
      isGlobal: false,
      isPublished: false,
      isGraded: source.isGraded,
      maxScore: source.maxScore,
      passingScore: source.passingScore,
      requiredScore: (source as any).requiredScore,
      maxAttempts: (source as any).maxAttempts,
      assignedTo: {
        learners: [],
        classes: [],
        programs: [],
      },
    });

    res.status(201).json({
      success: true,
      message: 'Package cloned successfully',
      data: {
        id: clone._id?.toString?.(),
        packageId: clone.packageId,
        department: clone.department,
        isGlobal: clone.isGlobal,
        status: clone.status,
      },
    });
  }
);

/**
 * @desc    Assign package to learners
 * @route   POST /api/scorm/packages/:id/assign
 * @access  Private (Instructor/Admin)
 */
export const assignPackage = asyncHandler(async (req: Request, res: Response) => {
  const { learnerIds, classIds, programIds } = req.body;

  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  const assignedTo = scormPackage.assignedTo || {
    learners: [],
    classes: [],
    programs: [],
  };

  // Add learners
  if (learnerIds && Array.isArray(learnerIds)) {
    const current = assignedTo.learners?.map(String) || [];
    const merged = Array.from(new Set([...current, ...learnerIds.map(String)]));
    assignedTo.learners = merged as any;
  }

  // Add classes
  if (classIds && Array.isArray(classIds)) {
    const current = assignedTo.classes?.map(String) || [];
    const merged = Array.from(new Set([...current, ...classIds.map(String)]));
    assignedTo.classes = merged as any;
  }

  // Add programs
  if (programIds && Array.isArray(programIds)) {
    const current = assignedTo.programs?.map(String) || [];
    const merged = Array.from(new Set([...current, ...programIds.map(String)]));
    assignedTo.programs = merged as any;
  }

  scormPackage.assignedTo = assignedTo;

  await scormPackage.save();

  res.status(200).json({
    success: true,
    message: 'Package assigned successfully',
    data: scormPackage,
  });
});

/**
 * @desc    Unassign package from learners
 * @route   POST /api/scorm/packages/:id/unassign
 * @access  Private (Instructor/Admin)
 */
export const unassignPackage = asyncHandler(async (req: Request, res: Response) => {
  const { learnerIds, classIds, programIds } = req.body;

  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    res.status(404);
    throw new Error('SCORM package not found');
  }

  const assignedTo = scormPackage.assignedTo || {
    learners: [],
    classes: [],
    programs: [],
  };

  // Remove learners
  if (learnerIds && Array.isArray(learnerIds)) {
    assignedTo.learners = (assignedTo.learners || []).filter(
      (id: any) => !learnerIds.map(String).includes(id.toString())
    );
  }

  // Remove classes
  if (classIds && Array.isArray(classIds)) {
    assignedTo.classes = (assignedTo.classes || []).filter(
      (id: any) => !classIds.map(String).includes(id.toString())
    );
  }

  // Remove programs
  if (programIds && Array.isArray(programIds)) {
    assignedTo.programs = (assignedTo.programs || []).filter(
      (id: any) => !programIds.map(String).includes(id.toString())
    );
  }

  scormPackage.assignedTo = assignedTo;

  await scormPackage.save();

  res.status(200).json({
    success: true,
    message: 'Package unassigned successfully',
    data: scormPackage,
  });
});

/**
 * @desc    Publish SCORM package
 * @route   POST /api/scorm/packages/:id/publish
 * @access  Private (Instructor/Admin)
 */
export const publishPackage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.userAuth!._id?.toString();
  const role = req.userAuth!.role;

  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    throw new NotFoundError('SCORM package not found');
  }

  const scope = req.departmentScope?.accessibleDepartmentIds;
  if (!isPackageInScope(scormPackage, scope)) {
    throw new AuthorizationError('Access to this package is not permitted for your department');
  }

  // Visibility/ownership check for staff
  if (role === 'staff' && scormPackage.uploadedBy?.toString() !== userId) {
    throw new NotFoundError('SCORM package not found');
  }

  // Idempotent: already published
  if (scormPackage.isPublished && scormPackage.status === 'published') {
    res.status(200).json({ success: true, data: scormPackage });
    return;
  }

  scormPackage.isPublished = true;
  (scormPackage as any).status = 'published';
  (scormPackage as any).publishedAt = new Date();
  (scormPackage as any).publishedBy = req.userAuth!._id;
  (scormPackage as any).publishedByModel = role === 'global-admin' ? 'Admin' : 'Staff';

  await scormPackage.save();

  res.status(200).json({ success: true, data: scormPackage });
});

/**
 * @desc    Unpublish SCORM package
 * @route   POST /api/scorm/packages/:id/unpublish
 * @access  Private (Instructor/Admin)
 */
export const unpublishPackage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.userAuth!._id?.toString();
  const role = req.userAuth!.role;

  const scormPackage = await ScormPackage.findById(req.params.id);

  if (!scormPackage) {
    throw new NotFoundError('SCORM package not found');
  }

  const scope = req.departmentScope?.accessibleDepartmentIds;
  if (!isPackageInScope(scormPackage, scope)) {
    throw new AuthorizationError('Access to this package is not permitted for your department');
  }

  // Visibility/ownership check for staff
  if (role === 'staff' && scormPackage.uploadedBy?.toString() !== userId) {
    throw new NotFoundError('SCORM package not found');
  }

  // Idempotent: already unpublished/draft
  if (!scormPackage.isPublished && scormPackage.status === 'draft') {
    res.status(200).json({ success: true, data: scormPackage });
    return;
  }

  scormPackage.isPublished = false;
  (scormPackage as any).status = 'draft';
  (scormPackage as any).unpublishedAt = new Date();
  (scormPackage as any).unpublishedBy = req.userAuth!._id;
  (scormPackage as any).unpublishedByModel = role === 'global-admin' ? 'Admin' : 'Staff';

  await scormPackage.save();

  res.status(200).json({ success: true, data: scormPackage });
});

/**
 * @desc    Get packages assigned to current learner
 * @route   GET /api/scorm/packages/my-assignments
 * @access  Private (Learner)
 */
export const getMyAssignments = asyncHandler(async (req: Request, res: Response) => {
  const learnerId = req.userAuth!._id;

  // Find packages assigned directly or through class/program
  const packages = await ScormPackage.findAssignedToLearner(learnerId);

  res.status(200).json({
    success: true,
    data: packages,
  });
});
