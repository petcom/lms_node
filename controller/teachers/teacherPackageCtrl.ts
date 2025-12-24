import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ScormPackage from '../../model/Scorm/ScormPackage';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import ClassLevel from '../../model/Academic/ClassLevel';
import { NotFoundError, ValidationError } from '../../utils/errors';

const asObjectId = (value: string) => new mongoose.Types.ObjectId(value);

const findPackageByAnyId = async (id: string) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const byObjectId = await ScormPackage.findById(id);
    if (byObjectId) return byObjectId;
  }
  return ScormPackage.findOne({ packageId: id });
};

const serializePackage = (pkg: any) => {
  const obj = pkg.toObject({ virtuals: true });
  return { ...obj, id: obj._id?.toString?.() };
};

const ensureOwnership = (pkg: any, req: Request) => {
  const role = req.userAuth!.role;
  const userId = req.userAuth!._id?.toString();
  if (role === 'teacher' && pkg.uploadedBy?.toString() !== userId) {
    throw new NotFoundError('SCORM package not found');
  }
};

export const publishTeacherPackage = asyncHandler(async (req: Request, res: Response) => {
  const pkg = await findPackageByAnyId(req.params.id);
  if (!pkg) {
    throw new NotFoundError('SCORM package not found');
  }

  ensureOwnership(pkg, req);

  if (pkg.isPublished && pkg.status === 'published') {
    return res.status(200).json({ success: true, data: serializePackage(pkg) });
  }

  pkg.isPublished = true;
  (pkg as any).status = 'published';
  (pkg as any).publishedAt = new Date();
  (pkg as any).publishedBy = req.userAuth!._id;
  (pkg as any).publishedByModel = req.userAuth!.role === 'admin' ? 'Admin' : 'Teacher';

  await pkg.save();

  res.status(200).json({ success: true, data: serializePackage(pkg) });
});

export const unpublishTeacherPackage = asyncHandler(async (req: Request, res: Response) => {
  const pkg = await findPackageByAnyId(req.params.id);
  if (!pkg) {
    throw new NotFoundError('SCORM package not found');
  }

  ensureOwnership(pkg, req);

  if (!pkg.isPublished && pkg.status === 'draft') {
    return res.status(200).json({ success: true, data: serializePackage(pkg) });
  }

  pkg.isPublished = false;
  (pkg as any).status = 'draft';
  (pkg as any).unpublishedAt = new Date();
  (pkg as any).unpublishedBy = req.userAuth!._id;
  (pkg as any).unpublishedByModel = req.userAuth!.role === 'admin' ? 'Admin' : 'Teacher';

  await pkg.save();

  res.status(200).json({ success: true, data: serializePackage(pkg) });
});

export const listTeacherPackages = asyncHandler(async (req: Request, res: Response) => {
  const { search, status } = req.query as { search?: string; status?: string };
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

  const role = req.userAuth!.role;
  const userId = req.userAuth!._id?.toString();

  const filters: any = {};
  if (role === 'teacher') {
    filters.uploadedBy = asObjectId(userId);
  }

  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) {
    filters.status = status;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    ScormPackage.find(filters).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ScormPackage.countDocuments(filters),
  ]);

  const packageIds = items.map((p) => p._id);
  const attemptStats = await ScormAttempt.aggregate([
    { $match: { package: { $in: packageIds } } },
    {
      $group: {
        _id: '$package',
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [{ $in: ['$status', ['completed', 'passed']] }, 1, 0],
          },
        },
      },
    },
  ]);

  const statsMap = attemptStats.reduce<Record<string, { total: number; completed: number }>>(
    (acc, cur) => {
      acc[cur._id.toString()] = { total: cur.total, completed: cur.completed };
      return acc;
    },
    {}
  );

  const mapped = items.map((pkg) => {
    const serialized = serializePackage(pkg);
    const stat = statsMap[pkg._id.toString()] || { total: 0, completed: 0 };
    const progressPct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;

    return {
      id: serialized.id,
      title: serialized.title,
      status: serialized.status,
      isPublished: serialized.isPublished,
      version: serialized.version,
      updatedAt: serialized.updatedAt,
      progressPct,
      attemptsCount: stat.total,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      items: mapped,
      total,
      page,
      pageSize: limit,
    },
  });
});

export const assignTeacherPackage = asyncHandler(async (req: Request, res: Response) => {
  const { packageId, classIds = [], dueDate } = req.body as {
    packageId?: string;
    classIds?: string[];
    dueDate?: string;
  };

  if (!packageId || !Array.isArray(classIds) || classIds.length === 0) {
    throw new ValidationError('packageId and classIds are required');
  }

  const pkg = await findPackageByAnyId(packageId);
  if (!pkg) {
    throw new NotFoundError('SCORM package not found');
  }

  ensureOwnership(pkg, req);

  const teacherId = req.userAuth!._id.toString();
  const classes = await ClassLevel.find({ _id: { $in: classIds } });

  const ownedClasses = classes.filter((c) =>
    (c.teachers || []).some((t) => t.toString() === teacherId)
  );

  if (ownedClasses.length !== classIds.length) {
    throw new NotFoundError('One or more classes not found for this teacher');
  }

  const assigned = pkg.assignedTo || { students: [], classLevels: [], programs: [] };
  const uniqueClassIds = Array.from(
    new Set([...(assigned.classLevels || []).map(String), ...classIds.map(String)])
  );
  assigned.classLevels = uniqueClassIds as any;
  pkg.assignedTo = assigned;

  if (dueDate) {
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) {
      throw new ValidationError('Invalid dueDate');
    }
    (pkg as any).dueDate = parsed;
  }

  await pkg.save();

  res.status(200).json({ success: true, assignmentId: pkg._id.toString() });
});
