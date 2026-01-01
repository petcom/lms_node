import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ScormPackage from '../../model/Scorm/ScormPackage';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import ClassLevel from '../../model/Academic/ClassLevel';
import { NotFoundError, ValidationError } from '../../utils/errors';
import Student from '../../model/Academic/Student';

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
  if (role === 'staff' && pkg.uploadedBy?.toString() !== userId) {
    throw new NotFoundError('SCORM package not found');
  }
};

export const publishTeacherPackage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const pkg = await findPackageByAnyId(req.params.id);
    if (!pkg) {
      throw new NotFoundError('SCORM package not found');
    }

    ensureOwnership(pkg, req);

    if (pkg.isPublished && pkg.status === 'published') {
      res.status(200).json({ success: true, data: serializePackage(pkg) });
      return;
    }

    pkg.isPublished = true;
    (pkg as any).status = 'published';
    (pkg as any).publishedAt = new Date();
    (pkg as any).publishedBy = req.userAuth!._id;
    (pkg as any).publishedByModel = req.userAuth!.role === 'admin' ? 'Admin' : 'Staff';

    await pkg.save();

    res.status(200).json({ success: true, data: serializePackage(pkg) });
  }
);

export const unpublishTeacherPackage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const pkg = await findPackageByAnyId(req.params.id);
    if (!pkg) {
      throw new NotFoundError('SCORM package not found');
    }

    ensureOwnership(pkg, req);

    if (!pkg.isPublished && pkg.status === 'draft') {
      res.status(200).json({ success: true, data: serializePackage(pkg) });
      return;
    }

    pkg.isPublished = false;
    (pkg as any).status = 'draft';
    (pkg as any).unpublishedAt = new Date();
    (pkg as any).unpublishedBy = req.userAuth!._id;
    (pkg as any).unpublishedByModel = req.userAuth!.role === 'admin' ? 'Admin' : 'Staff';

    await pkg.save();

    res.status(200).json({ success: true, data: serializePackage(pkg) });
  }
);

export const listTeacherClasses = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = req.userAuth!._id.toString();
  const role = req.userAuth!.role;
  const search = (req.query.search as string) || '';
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

  const classFilter: any = {};
  if (search) {
    classFilter.name = { $regex: search, $options: 'i' };
  }
  if (role === 'staff') {
    classFilter.teachers = new mongoose.Types.ObjectId(teacherId);
  }

  const skip = (page - 1) * limit;
  const [classes, total] = await Promise.all([
    ClassLevel.find(classFilter).skip(skip).limit(limit),
    ClassLevel.countDocuments(classFilter),
  ]);

  const classIds = classes.map((c) => c._id.toString());
  const students = await Student.find({ classLevels: { $in: classIds } }).select(
    'name classLevels'
  );
  const studentsByClass: Record<string, mongoose.Types.ObjectId[]> = {};
  students.forEach((s) => {
    (s.classLevels || []).forEach((cl: any) => {
      if (classIds.includes(cl)) {
        if (!studentsByClass[cl]) studentsByClass[cl] = [];
        studentsByClass[cl].push(s._id as any);
      }
    });
  });

  const studentIds = students.map((s) => s._id);
  const attemptAgg = await ScormAttempt.aggregate([
    { $match: { student: { $in: studentIds } } },
    {
      $group: {
        _id: '$student',
        completed: {
          $sum: { $cond: [{ $in: ['$status', ['completed', 'passed']] }, 1, 0] },
        },
        passed: {
          $sum: { $cond: [{ $eq: ['$status', 'passed'] }, 1, 0] },
        },
        total: { $sum: 1 },
      },
    },
  ]);
  const attemptMap = attemptAgg.reduce<
    Record<string, { completed: number; passed: number; total: number }>
  >((acc, cur) => {
    acc[cur._id.toString()] = {
      completed: cur.completed,
      passed: cur.passed,
      total: cur.total,
    };
    return acc;
  }, {});

  const items = classes.map((cls) => {
    const clsId = cls._id.toString();
    const classStudents = studentsByClass[clsId] || [];
    let totalAttempts = 0;
    let completedAttempts = 0;
    let passedAttempts = 0;
    classStudents.forEach((sid) => {
      const stats = attemptMap[sid.toString()];
      if (stats) {
        totalAttempts += stats.total;
        completedAttempts += stats.completed;
        passedAttempts += stats.passed;
      }
    });
    const completion =
      totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0;
    const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

    return {
      id: clsId,
      name: cls.name,
      students: classStudents.length,
      completion,
      passRate,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize: limit,
    },
  });
});

export const teacherDashboard = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = req.userAuth!._id.toString();
  const role = req.userAuth!.role;

  const classFilter: any = {};
  if (role === 'staff') {
    classFilter.teachers = new mongoose.Types.ObjectId(teacherId);
  }

  const classes = await ClassLevel.find(classFilter).select('_id');
  const classIds = classes.map((c) => c._id.toString());

  const students = await Student.find({ classLevels: { $in: classIds } }).select('_id');
  const studentIds = students.map((s) => s._id);

  const attempts = await ScormAttempt.find({ student: { $in: studentIds } }).select(
    'status package'
  );

  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter((a) =>
    ['completed', 'passed'].includes(a.status)
  ).length;
  const passedAttempts = attempts.filter((a) => a.status === 'passed').length;

  const avgCompletion =
    totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

  const activePackages = await ScormPackage.countDocuments(
    role === 'staff'
      ? { uploadedBy: new mongoose.Types.ObjectId(teacherId), isPublished: true }
      : { isPublished: true }
  );

  res.status(200).json({
    success: true,
    data: {
      classes: classIds.length,
      students: studentIds.length,
      activePackages,
      avgCompletion,
      passRate,
    },
  });
});

export const listTeacherAttempts = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = req.userAuth!._id.toString();
  const role = req.userAuth!.role;

  const classFilter: any = {};
  if (role === 'staff') {
    classFilter.teachers = new mongoose.Types.ObjectId(teacherId);
  }

  const classes = await ClassLevel.find(classFilter).select('_id');
  const allowedClassIds = classes.map((c) => c._id.toString());

  const filterClassId = req.query.classId as string | undefined;
  if (filterClassId && !allowedClassIds.includes(filterClassId) && role === 'staff') {
    throw new NotFoundError('Class not found');
  }

  const classIdsToUse = filterClassId ? [filterClassId] : allowedClassIds;

  const students = await Student.find({ classLevels: { $in: classIdsToUse } }).select(
    'name classLevels'
  );
  const studentIds = students.map((s) => s._id);
  const studentNameMap = students.reduce<Record<string, string>>((acc, s) => {
    acc[s._id.toString()] = s.name;
    return acc;
  }, {});

  const packageIdParam = req.query.packageId as string | undefined;
  let packageFilter: any = {};
  if (packageIdParam) {
    const pkg = await findPackageByAnyId(packageIdParam);
    if (!pkg) {
      throw new NotFoundError('SCORM package not found');
    }
    packageFilter = { package: pkg._id };
  }

  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    ScormAttempt.find({ student: { $in: studentIds }, ...packageFilter })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit),
    ScormAttempt.countDocuments({ student: { $in: studentIds }, ...packageFilter }),
  ]);

  const packageIds = items.map((a) => a.package);
  const packages = await ScormPackage.find({ _id: { $in: packageIds } }).select('title');
  const packageMap = packages.reduce<Record<string, string>>((acc, p) => {
    acc[p._id.toString()] = p.title;
    return acc;
  }, {});

  const mapped = items.map((a) => ({
    id: a._id.toString(),
    studentName: studentNameMap[a.student.toString()] || 'Unknown',
    packageTitle: packageMap[a.package.toString()] || 'Unknown',
    status: a.status,
    score: (a as any).scorePercentage || undefined,
    startedAt: a.startedAt,
    completedAt: a.completedAt,
  }));

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

export const listTeacherAssignments = asyncHandler(async (req: Request, res: Response) => {
  const teacherId = req.userAuth!._id.toString();
  const role = req.userAuth!.role;

  const classFilter: any = {};
  if (role === 'staff') {
    classFilter.teachers = new mongoose.Types.ObjectId(teacherId);
  }

  const classes = await ClassLevel.find(classFilter).select('name');
  const allowedClassIds = classes.map((c) => c._id.toString());
  const classNameMap = classes.reduce<Record<string, string>>((acc, c) => {
    acc[c._id.toString()] = c.name;
    return acc;
  }, {});

  const filterClassId = req.query.classId as string | undefined;
  if (filterClassId && !allowedClassIds.includes(filterClassId) && role === 'staff') {
    throw new NotFoundError('Class not found');
  }

  const classIdsToUse = filterClassId ? [filterClassId] : allowedClassIds;

  const pkgFilter: any = { 'assignedTo.classLevels': { $in: classIdsToUse } };
  if (role === 'staff') {
    pkgFilter.uploadedBy = new mongoose.Types.ObjectId(teacherId);
  }

  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
  const skip = (page - 1) * limit;

  const [packages, total] = await Promise.all([
    ScormPackage.find(pkgFilter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ScormPackage.countDocuments(pkgFilter),
  ]);

  const items = packages.map((pkg) => {
    const clsIds = (pkg.assignedTo?.classLevels || [])
      .map(String)
      .filter((id) => classIdsToUse.includes(id));
    return {
      id: pkg._id.toString(),
      packageTitle: pkg.title,
      classIds: clsIds,
      classNames: clsIds.map((id) => classNameMap[id]).filter(Boolean),
      dueDate: (pkg as any).dueDate,
      status: pkg.status,
      isPublished: (pkg as any).isPublished,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      items,
      total,
      page,
      pageSize: limit,
    },
  });
});

export const listTeacherPackages = asyncHandler(async (req: Request, res: Response) => {
  const { search, status } = req.query as { search?: string; status?: string };
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

  const role = req.userAuth!.role;
  const userId = req.userAuth!._id?.toString();

  const filters: any = {};
  if (role === 'staff') {
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
  const {
    packageId,
    classIds = [],
    dueDate,
  } = req.body as {
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
    throw new NotFoundError('One or more classes not found for this staff member');
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
