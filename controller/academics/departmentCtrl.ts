import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Department from '../../model/Academic/Department';
import Admin from '../../model/Staff/Admin';
import Teacher from '../../model/Staff/Teacher';
import Program from '../../model/Academic/Program';
import Subject from '../../model/Academic/Subject';
import ClassLevel from '../../model/Academic/ClassLevel';
import ScormPackage from '../../model/Scorm/ScormPackage';
import { IDepartment } from '../../types/models';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../utils/errors';

const MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

interface CreateDepartmentBody {
  name: string;
  code?: string;
  level: 'top' | 'sub';
  parent?: string | null;
}

interface UpdateDepartmentBody {
  name?: string;
  code?: string;
}

type DepartmentWithCounts = IDepartment & {
  counts: {
    staffCount: number;
    programCount: number;
    subjectCount: number;
    classLevelCount: number;
    packageCount: number;
    globalPackageCount: number;
  };
};

const buildCounts = async (departmentId: mongoose.Types.ObjectId): Promise<DepartmentWithCounts['counts']> => {
  const [adminCount, teacherCount, programCount, subjectCount, classLevelCount, packageCount, globalPackageCount] =
    await Promise.all([
      Admin.countDocuments({ department: departmentId }),
      Teacher.countDocuments({ department: departmentId }),
      Program.countDocuments({ department: departmentId }),
      Subject.countDocuments({ department: departmentId }),
      ClassLevel.countDocuments({ department: departmentId }),
      ScormPackage.countDocuments({ department: departmentId, isGlobal: { $ne: true } }),
      ScormPackage.countDocuments({ isGlobal: true }),
    ]);

  return {
    staffCount: adminCount + teacherCount,
    programCount,
    subjectCount,
    classLevelCount,
    packageCount,
    globalPackageCount,
  };
};

const ensureScope = (req: Request, departmentId: string): void => {
  const scope = req.departmentScope?.accessibleDepartmentIds;
  if (!scope || scope === 'all') return;

  if (!scope.includes(departmentId)) {
    throw new AuthorizationError('Access denied for this department');
  }
};

export const createDepartment = AsyncHandler(async (req: Request<{}, {}, CreateDepartmentBody>, res: Response): Promise<void> => {
  const { name, code, level, parent } = req.body;

  if (!['top', 'sub'].includes(level)) {
    throw new ValidationError('Only top and sub departments can be created');
  }

  const requesterDepartmentId = req.userAuth?.department
    ? new mongoose.Types.ObjectId(req.userAuth.department as any)
    : null;

  const requesterDepartment = requesterDepartmentId
    ? await Department.findById(requesterDepartmentId).lean()
    : null;

  const isMasterAdmin = requesterDepartment?.level === 'master' || req.departmentScope?.accessibleDepartmentIds === 'all';

  let parentId: mongoose.Types.ObjectId | null = null;
  let ancestors: mongoose.Types.ObjectId[] = [];

  if (level === 'top') {
    if (!isMasterAdmin) {
      throw new AuthorizationError('Only master admin can create top-level departments');
    }
  }

  if (level === 'sub') {
    if (!parent) {
      throw new ValidationError('Parent department is required for sub-departments');
    }

    const parentDept = await Department.findById(parent).lean();
    if (!parentDept) {
      throw new NotFoundError('Parent department not found');
    }
    if (parentDept.level !== 'top') {
      throw new ValidationError('Sub-departments must be created under a top-level department');
    }

    const isParentOwnedByRequester = parentDept._id.toString() === requesterDepartmentId?.toString();
    if (!isMasterAdmin && !isParentOwnedByRequester) {
      throw new AuthorizationError('You can only create sub-departments under your own top-level department');
    }

    parentId = parentDept._id;
    ancestors = [parentDept._id, ...(parentDept.ancestors || [])] as mongoose.Types.ObjectId[];
  }

  const duplicate = await Department.findOne({ name, parent: parentId }).lean();
  if (duplicate) {
    throw new ConflictError('A department with this name already exists at this level');
  }

  const department = await Department.create({
    name,
    code,
    level,
    parent: parentId,
    ancestors,
  });

  res.status(201).json({
    status: 'success',
    message: 'Department created successfully',
    data: department,
  });
});

export const getDepartments = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const base = res.results;
  const departments = (base?.data as IDepartment[]) || [];

  const departmentsToProcess = departments.length > 0
    ? departments
    : await Department.find({}).lean();

  const enriched = await Promise.all(
    departmentsToProcess.map(async (dept) => ({
      ...(dept.toObject ? dept.toObject() : dept),
      counts: await buildCounts(dept._id as mongoose.Types.ObjectId),
    }))
  );

  if (base) {
    res.status(200).json({ ...base, data: enriched });
    return;
  }

  res.status(200).json({
    status: 'success',
    message: 'Departments fetched successfully',
    data: enriched,
  });
});

export const getDepartment = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const department = await Department.findById(req.params.id).lean();
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  ensureScope(req, department._id.toString());

  const counts = await buildCounts(department._id as mongoose.Types.ObjectId);

  res.status(200).json({
    status: 'success',
    message: 'Department fetched successfully',
    data: { ...department, counts },
  });
});

export const updateDepartment = AsyncHandler(async (req: Request<{ id: string }, {}, UpdateDepartmentBody>, res: Response): Promise<void> => {
  const { name, code } = req.body;

  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  ensureScope(req, department._id.toString());

  if (name) {
    const duplicate = await Department.findOne({
      name,
      parent: department.parent,
      _id: { $ne: department._id },
    }).lean();
    if (duplicate) {
      throw new ConflictError('A department with this name already exists at this level');
    }
  }

  if ('level' in req.body || 'parent' in req.body) {
    throw new ValidationError('Changing level or parent is not supported');
  }

  if (name !== undefined) department.name = name;
  if (code !== undefined) department.code = code;

  await department.save();

  const counts = await buildCounts(department._id as mongoose.Types.ObjectId);

  res.status(200).json({
    status: 'success',
    message: 'Department updated successfully',
    data: { ...department.toObject(), counts },
  });
});

export const deleteDepartment = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  if (department.level === 'master' || department._id.toString() === MASTER_DEPARTMENT_ID) {
    throw new AuthorizationError('Master department cannot be deleted');
  }

  ensureScope(req, department._id.toString());

  const [childCount, staffCounts, programCount, subjectCount, classLevelCount, packageCount] = await Promise.all([
    Department.countDocuments({ parent: department._id }),
    Promise.all([
      Admin.countDocuments({ department: department._id }),
      Teacher.countDocuments({ department: department._id }),
    ]),
    Program.countDocuments({ department: department._id }),
    Subject.countDocuments({ department: department._id }),
    ClassLevel.countDocuments({ department: department._id }),
    ScormPackage.countDocuments({ department: department._id }),
  ]);

  const staffCount = staffCounts.reduce((sum, val) => sum + val, 0);

  if (childCount > 0) {
    throw new ValidationError('Department has child departments. Delete or move them first.');
  }
  if (staffCount > 0 || programCount > 0 || subjectCount > 0 || classLevelCount > 0 || packageCount > 0) {
    throw new ValidationError('Department has associated staff or content and cannot be deleted');
  }

  await department.deleteOne();

  res.status(200).json({
    status: 'success',
    message: 'Department deleted successfully',
  });
});
