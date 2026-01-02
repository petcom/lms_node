import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ScormPackage from '../../model/Scorm/ScormPackage';
import ContentAttempt from '../../model/Academic/ContentAttempt';
import CourseContent from '../../model/Academic/CourseContent';
import ClassModel from '../../model/Academic/Class';
import ClassEnrollment from '../../model/Academic/ClassEnrollment';
import { NotFoundError, ValidationError } from '../../utils/errors';
import Learner from '../../model/Academic/Learner';

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

export const publishInstructorPackage = asyncHandler(
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
    (pkg as any).publishedByModel = req.userAuth!.role === 'global-admin' ? 'Admin' : 'Staff';

    await pkg.save();

    res.status(200).json({ success: true, data: serializePackage(pkg) });
  }
);

export const unpublishInstructorPackage = asyncHandler(
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
    (pkg as any).unpublishedByModel = req.userAuth!.role === 'global-admin' ? 'Admin' : 'Staff';

    await pkg.save();

    res.status(200).json({ success: true, data: serializePackage(pkg) });
  }
);

export const listInstructorClasses = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = req.userAuth!._id.toString();
  const role = req.userAuth!.role;
  const search = (req.query.search as string) || '';
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;

  const classFilter: any = {};
  if (search) {
    classFilter.name = { $regex: search, $options: 'i' };
  }
  if (role === 'staff') {
    classFilter.instructors = new mongoose.Types.ObjectId(instructorId);
  }

  const skip = (page - 1) * limit;
  const [classes, total] = await Promise.all([
    ClassModel.find(classFilter).skip(skip).limit(limit),
    ClassModel.countDocuments(classFilter),
  ]);

  const classIds = classes.map((c) => c._id.toString());
  const enrollments = await ClassEnrollment.find({ class: { $in: classIds } }).select(
    'class learner'
  );
  const learnersByClass: Record<string, mongoose.Types.ObjectId[]> = {};
  const learnerIdsSet = new Set<string>();

  enrollments.forEach((enrollment) => {
    const classId = enrollment.class.toString();
    const learnerId = enrollment.learner.toString();
    learnerIdsSet.add(learnerId);
    if (!learnersByClass[classId]) {
      learnersByClass[classId] = [];
    }
    learnersByClass[classId].push(enrollment.learner as any);
  });

  const learnerIds = Array.from(learnerIdsSet).map((id) => new mongoose.Types.ObjectId(id));
  const attemptAgg =
    learnerIds.length === 0
      ? []
      : await ContentAttempt.aggregate([
          { $match: { learner: { $in: learnerIds }, contentType: 'scorm' } },
          {
            $group: {
              _id: '$learner',
              completed: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
              },
              passed: {
                $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] },
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
    const classLearners = learnersByClass[clsId] || [];
    let totalAttempts = 0;
    let completedAttempts = 0;
    let passedAttempts = 0;
    classLearners.forEach((sid) => {
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
      learners: classLearners.length,
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

export const instructorDashboard = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = req.userAuth!._id.toString();
  const role = req.userAuth!.role;

  const classFilter: any = {};
  if (role === 'staff') {
    classFilter.instructors = new mongoose.Types.ObjectId(instructorId);
  }

  const classes = await ClassModel.find(classFilter).select('_id');
  const classIds = classes.map((c) => c._id.toString());

  const enrollments = await ClassEnrollment.find({ class: { $in: classIds } }).select('learner');
  const learnerIds = enrollments.map((enrollment) => enrollment.learner);

  const attempts = await ContentAttempt.find({
    learner: { $in: learnerIds },
    contentType: 'scorm',
  }).select('status passed');

  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter((a) => a.status === 'completed').length;
  const passedAttempts = attempts.filter((a) => a.passed).length;

  const avgCompletion =
    totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

  const activePackages = await ScormPackage.countDocuments(
    role === 'staff'
      ? { uploadedBy: new mongoose.Types.ObjectId(instructorId), isPublished: true }
      : { isPublished: true }
  );

  res.status(200).json({
    success: true,
    data: {
      classes: classIds.length,
      learners: learnerIds.length,
      activePackages,
      avgCompletion,
      passRate,
    },
  });
});

export const listInstructorAttempts = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = req.userAuth!._id.toString();
  const role = req.userAuth!.role;

  const classFilter: any = {};
  if (role === 'staff') {
    classFilter.instructors = new mongoose.Types.ObjectId(instructorId);
  }

  const classes = await ClassModel.find(classFilter).select('_id');
  const allowedClassIds = classes.map((c) => c._id.toString());

  const filterClassId = req.query.classId as string | undefined;
  if (filterClassId && !allowedClassIds.includes(filterClassId) && role === 'staff') {
    throw new NotFoundError('Class not found');
  }

  const classIdsToUse = filterClassId ? [filterClassId] : allowedClassIds;

  const enrollments = await ClassEnrollment.find({ class: { $in: classIdsToUse } }).select(
    'learner'
  );
  const learnerIds = Array.from(
    new Set(enrollments.map((enrollment) => enrollment.learner.toString()))
  ).map((id) => new mongoose.Types.ObjectId(id));
  const learners = await Learner.find({ _id: { $in: learnerIds } }).select('name');
  const learnerNameMap = learners.reduce<Record<string, string>>((acc, s) => {
    acc[s._id.toString()] = s.name;
    return acc;
  }, {});

  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
  const skip = (page - 1) * limit;

  const packageIdParam = req.query.packageId as string | undefined;
  let packageFilter: any = {};
  if (packageIdParam) {
    const pkg = await findPackageByAnyId(packageIdParam);
    if (!pkg) {
      throw new NotFoundError('SCORM package not found');
    }
    const courseContents = await CourseContent.find({ scormPackageId: pkg._id }).select('_id');
    const courseContentIds = courseContents.map((content) => content._id);
    if (courseContentIds.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          items: [],
          total: 0,
          page,
          pageSize: limit,
        },
      });
      return;
    }
    packageFilter = { courseContent: { $in: courseContentIds } };
  }

  const [items, total] = await Promise.all([
    ContentAttempt.find({
      learner: { $in: learnerIds },
      contentType: 'scorm',
      ...packageFilter,
    })
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit),
    ContentAttempt.countDocuments({
      learner: { $in: learnerIds },
      contentType: 'scorm',
      ...packageFilter,
    }),
  ]);

  const courseContentIds = items.map((a) => a.courseContent);
  const courseContents = await CourseContent.find({ _id: { $in: courseContentIds } }).select(
    'scormPackageId'
  );
  const courseContentToPackage = courseContents.reduce<Record<string, string>>((acc, content) => {
    if (content.scormPackageId) {
      acc[content._id.toString()] = content.scormPackageId.toString();
    }
    return acc;
  }, {});
  const packageIds = Object.values(courseContentToPackage);
  const packages = await ScormPackage.find({ _id: { $in: packageIds } }).select('title');
  const packageMap = packages.reduce<Record<string, string>>((acc, p) => {
    acc[p._id.toString()] = p.title;
    return acc;
  }, {});

  const mapped = items.map((a) => ({
    id: a._id.toString(),
    learnerName: learnerNameMap[a.learner.toString()] || 'Unknown',
    packageTitle: packageMap[courseContentToPackage[a.courseContent.toString()]] || 'Unknown',
    status: a.status,
    score: a.score ?? undefined,
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

export const listInstructorAssignments = asyncHandler(async (req: Request, res: Response) => {
  const instructorId = req.userAuth!._id.toString();
  const role = req.userAuth!.role;

  const classFilter: any = {};
  if (role === 'staff') {
    classFilter.instructors = new mongoose.Types.ObjectId(instructorId);
  }

  const classes = await ClassModel.find(classFilter).select('name');
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

  const pkgFilter: any = { 'assignedTo.classes': { $in: classIdsToUse } };
  if (role === 'staff') {
    pkgFilter.uploadedBy = new mongoose.Types.ObjectId(instructorId);
  }

  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
  const skip = (page - 1) * limit;

  const [packages, total] = await Promise.all([
    ScormPackage.find(pkgFilter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    ScormPackage.countDocuments(pkgFilter),
  ]);

  const items = packages.map((pkg) => {
    const clsIds = (pkg.assignedTo?.classes || [])
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

export const listInstructorPackages = asyncHandler(async (req: Request, res: Response) => {
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
  const courseContents = await CourseContent.find({
    scormPackageId: { $in: packageIds },
  }).select('_id scormPackageId');
  const contentIds = courseContents.map((content) => content._id);
  const contentToPackage = courseContents.reduce<Record<string, string>>((acc, content) => {
    if (content.scormPackageId) {
      acc[content._id.toString()] = content.scormPackageId.toString();
    }
    return acc;
  }, {});

  const attemptStats =
    contentIds.length === 0
      ? []
      : await ContentAttempt.aggregate([
          { $match: { courseContent: { $in: contentIds }, contentType: 'scorm' } },
          {
            $group: {
              _id: '$courseContent',
              total: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
              },
            },
          },
        ]);

  const statsMap = attemptStats.reduce<Record<string, { total: number; completed: number }>>(
    (acc, cur) => {
      const packageId = contentToPackage[cur._id.toString()];
      if (!packageId) {
        return acc;
      }
      const existing = acc[packageId] || { total: 0, completed: 0 };
      acc[packageId] = {
        total: existing.total + cur.total,
        completed: existing.completed + cur.completed,
      };
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

export const assignInstructorPackage = asyncHandler(async (req: Request, res: Response) => {
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

  const instructorId = req.userAuth!._id.toString();
  const classes = await ClassModel.find({ _id: { $in: classIds } });

  const ownedClasses = classes.filter((c) =>
    (c.instructors || []).some((t) => t.toString() === instructorId)
  );

  if (ownedClasses.length !== classIds.length) {
    throw new NotFoundError('One or more classes not found for this staff member');
  }

  const assigned = pkg.assignedTo || { learners: [], classes: [], programs: [] };
  const uniqueClassIds = Array.from(
    new Set([...(assigned.classes || []).map(String), ...classIds.map(String)])
  );
  assigned.classes = uniqueClassIds as any;
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
