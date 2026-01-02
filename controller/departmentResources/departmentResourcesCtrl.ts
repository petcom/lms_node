import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Admin from '../../model/Staff/Admin';
import Staff from '../../model/Staff/Staff';
import StaffRole from '../../model/Staff/StaffRole';
import User from '../../model/Auth/User';
import Department from '../../model/Academic/Department';
import ScormPackage from '../../model/Scorm/ScormPackage';
import Exam from '../../model/Academic/Exam';
import Course from '../../model/Content/Course';
import Program from '../../model/Academic/Program';
import ProgramLevel from '../../model/Academic/ProgramLevel';
import { IDepartment } from '../../types/models-types';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';
import { normalizePage, resolvePagination } from '../../utils/pagination';

type DepartmentSummary = {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  level: number;
  passingStyleScore?: number | null;
};

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: 'global-admin' | 'staff';
  roles?: string[];
  department: DepartmentSummary | null;
};

type ContentItem = {
  id: string;
  type: 'scorm' | 'custom';
  customType?: 'exam' | 'quiz' | 'practice' | 'other';
  title: string;
  department: DepartmentSummary | null;
};

type DepartmentNode = DepartmentSummary & {
  children: DepartmentNode[];
};

const MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

const getLevelNumber = (level: IDepartment['level']): number => {
  if (level === 'master') return 0;
  if (level === 'top') return 1;
  return 2;
};

const toDepartmentSummary = (
  dept: IDepartment,
  passingStyleScore?: number | null
): DepartmentSummary => ({
  id: dept._id.toString(),
  name: dept.name,
  code: dept.code ?? null,
  parentId: dept.parent ? dept.parent.toString() : null,
  level: getLevelNumber(dept.level),
  passingStyleScore,
});

const parsePagination = async (
  req: Request
): Promise<{ skip: number; limit: number; page: number }> => {
  const page = normalizePage(req.query.page);
  const { limit } = await resolvePagination('departmentResources', req.query.limit);
  return { skip: (page - 1) * limit, limit, page };
};

const getDisplayName = (name: any): string => {
  if (!name) return '';
  if (typeof name === 'string') return name;
  if (name.display) return name.display;
  const first = name.first ? String(name.first).trim() : '';
  const last = name.last ? String(name.last).trim() : '';
  const middleInitial = name.middle ? ` ${String(name.middle).trim()[0]?.toUpperCase()}.` : '';
  if (!first && !last) return '';
  return `${last}, ${first}${middleInitial}`.trim();
};

const resolveDepartmentScope = async (
  req: Request,
  departmentId?: string
): Promise<{
  isGlobalScope: boolean;
  departmentIds: string[] | null;
  departments: IDepartment[];
}> => {
  const scope = req.departmentScope?.accessibleDepartmentIds;
  const isGlobalScope = !scope || scope === 'all';

  if (departmentId && !mongoose.isValidObjectId(departmentId)) {
    throw new ValidationError('departmentId must be a valid ObjectId');
  }

  if (departmentId && !isGlobalScope) {
    if (!scope?.includes(departmentId)) {
      throw new AuthorizationError('Access denied for this department');
    }
  }

  const departmentIds = departmentId
    ? [departmentId]
    : isGlobalScope
      ? null
      : (scope as string[]);

  const departments = await Department.find(
    departmentIds ? { _id: { $in: departmentIds } } : {}
  ).lean();

  return { isGlobalScope, departmentIds, departments };
};

const buildDepartmentRecordMap = (departments: IDepartment[]): Map<string, IDepartment> => {
  const map = new Map<string, IDepartment>();
  departments.forEach((dept) => {
    map.set(dept._id.toString(), dept);
  });
  return map;
};

const resolvePassingStyleScore = (
  department: IDepartment,
  departmentMap: Map<string, IDepartment>,
  masterFallback: number | null
): number | null => {
  if (typeof department.passingStyleScore === 'number') {
    return department.passingStyleScore;
  }

  let parentId = department.parent ? department.parent.toString() : null;
  while (parentId) {
    const parent = departmentMap.get(parentId);
    if (!parent) break;
    if (typeof parent.passingStyleScore === 'number') {
      return parent.passingStyleScore;
    }
    parentId = parent.parent ? parent.parent.toString() : null;
  }

  return masterFallback;
};

const resolveMasterPassingStyleScore = async (
  departments: IDepartment[]
): Promise<number | null> => {
  const localMaster = departments.find((dept) => dept.level === 'master');
  if (typeof localMaster?.passingStyleScore === 'number') {
    return localMaster.passingStyleScore;
  }
  const master = await Department.findById(MASTER_DEPARTMENT_ID)
    .select('passingStyleScore')
    .lean();
  return typeof master?.passingStyleScore === 'number' ? master.passingStyleScore : null;
};

const buildDepartmentMap = async (
  departments: IDepartment[]
): Promise<Map<string, DepartmentSummary>> => {
  const recordMap = buildDepartmentRecordMap(departments);
  const masterFallback = await resolveMasterPassingStyleScore(departments);
  const map = new Map<string, DepartmentSummary>();
  departments.forEach((dept) => {
    const passingStyleScore = resolvePassingStyleScore(dept, recordMap, masterFallback);
    map.set(dept._id.toString(), toDepartmentSummary(dept, passingStyleScore));
  });
  return map;
};

const normalizeExamType = (
  examType?: string
): NonNullable<ContentItem['customType']> => {
  const normalized = (examType || '').toLowerCase();
  if (normalized === 'exam') return 'exam';
  if (normalized === 'quiz') return 'quiz';
  if (normalized === 'practice') return 'practice';
  return 'other';
};

const ensureDepartmentScope = (
  scope: string[] | 'all' | undefined,
  departmentId: string | null,
  message: string
): void => {
  if (scope && scope !== 'all' && departmentId && !scope.includes(departmentId)) {
    throw new AuthorizationError(message);
  }
};

const resolveDepartmentId = async (
  model: mongoose.Model<any>,
  id: string,
  label: string
): Promise<string | null> => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ValidationError(`Invalid ${label} id`);
  }
  const doc = await model.findById(id).select('department').lean();
  if (!doc) {
    throw new NotFoundError(`${label} not found`);
  }
  return doc.department ? doc.department.toString() : null;
};

export const listStaffUsers = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, departmentId } = req.query as { type?: string; departmentId?: string };
  const { departmentIds, departments } = await resolveDepartmentScope(req, departmentId);

  const departmentMap = await buildDepartmentMap(departments);

  const adminFilter =
    departmentIds === null
      ? {}
      : { department: { $in: departmentIds.map((id) => new mongoose.Types.ObjectId(id)) } };
  const staffFilter =
    departmentIds === null
      ? {}
      : { department: { $in: departmentIds.map((id) => new mongoose.Types.ObjectId(id)) } };

  const [admins, staffMembers] = await Promise.all([
    Admin.find(adminFilter).select('name email department').lean(),
    Staff.find(staffFilter).select('name email department').lean(),
  ]);
  const adminIds = admins.map((admin) => admin._id);
  const staffIds = staffMembers.map((staff) => staff._id);
  const [adminUsers, staffUsers] = await Promise.all([
    User.find({ _id: { $in: adminIds }, role: 'global-admin' }).select('_id role').lean(),
    User.find({ _id: { $in: staffIds }, role: 'staff' }).select('_id subroles').lean(),
  ]);
  const adminUserMap = new Map(adminUsers.map((user) => [user._id.toString(), user.role]));
  const staffUserMap = new Map(
    staffUsers.map((user) => [user._id.toString(), user.subroles || []])
  );

  const adminItems: StaffUser[] = admins.map((admin) => {
    const deptId = admin.department ? admin.department.toString() : null;
    const deptSummary = deptId ? departmentMap.get(deptId) || null : null;
    return {
      id: admin._id.toString(),
      name: getDisplayName(admin.name),
      email: admin.email,
      role: adminUserMap.get(admin._id.toString()) || 'global-admin',
      department: deptSummary,
    };
  });

  const staffItems: StaffUser[] = staffMembers.map((staff) => {
    const deptId = staff.department ? staff.department.toString() : null;
    const deptSummary = deptId ? departmentMap.get(deptId) || null : null;
    return {
      id: staff._id.toString(),
      name: getDisplayName(staff.name),
      email: staff.email,
      role: 'staff',
      roles: staffUserMap.get(staff._id.toString()) || [],
      department: deptSummary,
    };
  });

  let items: StaffUser[] = [];
  const normalizedType = type?.toLowerCase();
  const staffSubtypeFilters = new Set([
    'instructor',
    'department-admin',
    'content-admin',
    'billing-admin',
  ]);

  if (normalizedType === 'staff') {
    items = staffItems;
  } else if (normalizedType === 'global-admin') {
    items = adminItems;
  } else if (normalizedType && staffSubtypeFilters.has(normalizedType)) {
    items = staffItems.filter((staff) => staff.roles?.includes(normalizedType));
  } else {
    items = [...adminItems, ...staffItems];
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  const pagination = await parsePagination(req);
  const paged = items.slice(pagination.skip, pagination.skip + pagination.limit);
  res.status(200).json({
    status: 'success',
    message: 'Staff users fetched successfully',
    items: paged,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: items.length,
      pages: Math.ceil(items.length / pagination.limit) || 1,
    },
  });
});

export const listDepartmentContent = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { type, customType, departmentId } = req.query as {
      type?: 'scorm' | 'custom';
      customType?: 'exam' | 'quiz' | 'practice' | 'other';
      departmentId?: string;
    };
    const { departmentIds, departments } = await resolveDepartmentScope(req, departmentId);

    const departmentMap = await buildDepartmentMap(departments);

    const departmentObjectIds =
      departmentIds?.map((id) => new mongoose.Types.ObjectId(id)) ?? null;

    const scormFilter =
      departmentObjectIds === null ? {} : { department: { $in: departmentObjectIds } };
    const scormPromise =
      type && type !== 'scorm' ? Promise.resolve([]) : ScormPackage.find(scormFilter).lean();

    const courseFilter =
      departmentObjectIds === null ? {} : { department: { $in: departmentObjectIds } };
    const coursePromise = Course.find(courseFilter).select('_id department').lean();

    const [scormPackages, courses] = await Promise.all([scormPromise, coursePromise]);
    const courseIds = courses.map((course) => course._id);
    const courseDepartmentMap = new Map<string, DepartmentSummary | null>();
    courses.forEach((course) => {
      const deptId = course.department ? course.department.toString() : null;
      courseDepartmentMap.set(
        course._id.toString(),
        deptId ? departmentMap.get(deptId) || null : null
      );
    });

    const examFilter: Record<string, any> = {};
    if (courseIds.length > 0) {
      examFilter.course = { $in: courseIds };
    }

    const exams =
      type && type === 'scorm'
        ? []
        : await Exam.find(examFilter).select('name examType course').lean();

    const items: ContentItem[] = [];

    scormPackages.forEach((pkg) => {
      const deptId = pkg.department ? pkg.department.toString() : null;
      const deptSummary = deptId ? departmentMap.get(deptId) || null : null;
      items.push({
        id: pkg._id.toString(),
        type: 'scorm',
        title: pkg.title,
        department: deptSummary,
      });
    });

    exams.forEach((exam) => {
      const derivedCustomType = normalizeExamType(exam.examType);
      if (customType && derivedCustomType !== customType) {
        return;
      }
      const courseId = exam.course ? exam.course.toString() : '';
      const deptSummary = courseDepartmentMap.get(courseId) || null;
      items.push({
        id: exam._id.toString(),
        type: 'custom',
        customType: derivedCustomType,
        title: exam.name,
        department: deptSummary,
      });
    });

    const pagination = await parsePagination(req);
    const paged = items.slice(pagination.skip, pagination.skip + pagination.limit);
    res.status(200).json({
      status: 'success',
      message: 'Department content fetched successfully',
      items: paged,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: items.length,
        pages: Math.ceil(items.length / pagination.limit) || 1,
      },
    });
  }
);

export const listDepartmentHierarchy = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { departments } = await resolveDepartmentScope(req);
    const nodes = new Map<string, DepartmentNode>();
    const departmentMap = await buildDepartmentMap(departments);

    departments.forEach((dept) => {
      const summary = departmentMap.get(dept._id.toString()) || toDepartmentSummary(dept);
      nodes.set(summary.id, { ...summary, children: [] });
    });

    const roots: DepartmentNode[] = [];
    nodes.forEach((node) => {
      const parentId = node.parentId;
      if (parentId && nodes.has(parentId)) {
        nodes.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Department hierarchy fetched successfully',
      items: roots,
    });
  }
);

export const updateStaffRoles = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const staffId = req.params.id;
  const { roles } = req.body as { roles: string[] };

  if (!mongoose.isValidObjectId(staffId)) {
    throw new ValidationError('Invalid staff id');
  }

  const staff = await Staff.findById(staffId);
  if (!staff) {
    throw new NotFoundError('Staff member not found');
  }
  const staffUser = await User.findById(staffId).lean();
  if (!staffUser || staffUser.role !== 'staff') {
    throw new NotFoundError('Staff user account not found');
  }

  const scope = req.departmentScope?.accessibleDepartmentIds;
  const staffDept = staff.department ? staff.department.toString() : null;
  ensureDepartmentScope(scope, staffDept, 'Access denied for this staff member');

  const requestedRoles = Array.isArray(roles)
    ? roles.map((role) => role.trim()).filter(Boolean)
    : [];
  const uniqueRoles = Array.from(new Set(requestedRoles));

  if (uniqueRoles.length > 0) {
    const roleDocs = await StaffRole.find({ name: { $in: uniqueRoles } })
      .select('name')
      .lean();
    const validRoles = new Set(roleDocs.map((role) => role.name));
    const missing = uniqueRoles.filter((role) => !validRoles.has(role));
    if (missing.length > 0) {
      throw new ValidationError(`Unknown staff roles: ${missing.join(', ')}`);
    }
  }

  await User.findByIdAndUpdate(
    staffId,
    { $set: { subroles: uniqueRoles } },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Staff roles updated successfully',
    data: {
      ...staff.toObject(),
      roles: uniqueRoles,
    },
  });
});

export const updateStaffDepartment = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const staffId = req.params.id;
    const { departmentId } = req.body as { departmentId: string | null };

    if (!mongoose.isValidObjectId(staffId)) {
      throw new ValidationError('Invalid staff id');
    }

    if (departmentId !== null && departmentId !== undefined) {
      if (!mongoose.isValidObjectId(departmentId)) {
        throw new ValidationError('Invalid department id');
      }
    }

    const staff = await Staff.findById(staffId);
    if (!staff) {
      throw new NotFoundError('Staff member not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const staffDept = staff.department ? staff.department.toString() : null;
    ensureDepartmentScope(scope, staffDept, 'Access denied for this staff member');

    if (departmentId === null) {
      if (scope && scope !== 'all') {
        throw new AuthorizationError('Access denied for this department change');
      }
      staff.department = undefined;
    } else if (departmentId) {
      ensureDepartmentScope(scope, departmentId, 'Access denied for this department');
      staff.department = new mongoose.Types.ObjectId(departmentId);
    }

    await staff.save();

    res.status(200).json({
      status: 'success',
      message: 'Staff department updated successfully',
      data: staff,
    });
  }
);

export const createDepartmentContent = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { type } = req.body as { type: 'scorm' | 'custom' };

    if (type === 'scorm') {
      throw new ValidationError('Use /api/v1/content/scorm/packages for SCORM uploads');
    }

    if (type !== 'custom') {
      throw new ValidationError('type must be one of: scorm, custom');
    }

    const {
      title,
      description,
      customType,
      course,
      program,
      programLevel,
      academicTerm,
      academicYear,
      passMark,
      totalMark,
      duration,
      examDate,
      examTime,
      examStatus,
    } = req.body as Record<string, any>;

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const courseDept = await resolveDepartmentId(Course, course, 'course');
    ensureDepartmentScope(scope, courseDept, 'Access denied for this course');
    const programDept = await resolveDepartmentId(Program, program, 'program');
    ensureDepartmentScope(scope, programDept, 'Access denied for this program');
    const programLevelDept = programLevel
      ? await resolveDepartmentId(ProgramLevel, programLevel, 'program level')
      : null;
    if (programLevelDept) {
      ensureDepartmentScope(scope, programLevelDept, 'Access denied for this program level');
    }

    if (!mongoose.isValidObjectId(academicTerm)) {
      throw new ValidationError('Invalid academic term id');
    }
    if (!mongoose.isValidObjectId(academicYear)) {
      throw new ValidationError('Invalid academic year id');
    }

    const exam = await Exam.create({
      name: title,
      description,
      course: new mongoose.Types.ObjectId(course),
      program: new mongoose.Types.ObjectId(program),
      programLevel: programLevel ? new mongoose.Types.ObjectId(programLevel) : undefined,
      academicTerm: new mongoose.Types.ObjectId(academicTerm),
      academicYear: new mongoose.Types.ObjectId(academicYear),
      passMark,
      totalMark,
      duration,
      examDate,
      examTime,
      examStatus,
      examType: customType,
      createdBy: req.userAuth?._id,
    });

    const departmentRecord = courseDept ? await Department.findById(courseDept).lean() : null;
    const deptSummary = departmentRecord ? toDepartmentSummary(departmentRecord) : null;

    res.status(201).json({
      status: 'success',
      message: 'Content created successfully',
      data: {
        id: exam._id.toString(),
        type: 'custom',
        customType: normalizeExamType(exam.examType),
        title: exam.name,
        department: deptSummary,
      },
    });
  }
);

export const updateDepartmentContent = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { type } = req.body as { type: 'scorm' | 'custom' };
    const contentId = req.params.id;

    if (!mongoose.isValidObjectId(contentId)) {
      throw new ValidationError('Invalid content id');
    }

    if (type === 'scorm') {
      const pkg = await ScormPackage.findById(contentId);
      if (!pkg) {
        throw new NotFoundError('Content not found');
      }

      const scope = req.departmentScope?.accessibleDepartmentIds;
      const currentDept = pkg.department ? pkg.department.toString() : null;
      ensureDepartmentScope(scope, currentDept, 'Access denied for this content');

      const {
        title,
        description,
        departmentId,
        course,
        program,
        programLevel,
        academicTerm,
      } = req.body as Record<string, any>;

      if (departmentId !== undefined) {
        if (departmentId === null) {
          if (scope && scope !== 'all') {
            throw new AuthorizationError('Access denied for this department change');
          }
          pkg.department = undefined;
        } else {
          if (!mongoose.isValidObjectId(departmentId)) {
            throw new ValidationError('Invalid department id');
          }
          ensureDepartmentScope(scope, departmentId, 'Access denied for this department');
          pkg.department = new mongoose.Types.ObjectId(departmentId);
        }
      }

      if (course) {
        const courseDept = await resolveDepartmentId(Course, course, 'course');
        ensureDepartmentScope(scope, courseDept, 'Access denied for this course');
        pkg.course = new mongoose.Types.ObjectId(course);
      }

      if (program) {
        const programDept = await resolveDepartmentId(Program, program, 'program');
        ensureDepartmentScope(scope, programDept, 'Access denied for this program');
        pkg.program = new mongoose.Types.ObjectId(program);
      }

      if (programLevel) {
        const programLevelDept = await resolveDepartmentId(
          ProgramLevel,
          programLevel,
          'program level'
        );
        ensureDepartmentScope(scope, programLevelDept, 'Access denied for this program level');
        pkg.programLevel = new mongoose.Types.ObjectId(programLevel);
      }

      if (academicTerm) {
        if (!mongoose.isValidObjectId(academicTerm)) {
          throw new ValidationError('Invalid academic term id');
        }
        pkg.academicTerm = new mongoose.Types.ObjectId(academicTerm);
      }

      if (title !== undefined) {
        pkg.title = title;
      }
      if (description !== undefined) {
        pkg.description = description;
      }

      await pkg.save();

      res.status(200).json({
        status: 'success',
        message: 'Content updated successfully',
        data: pkg,
      });
      return;
    }

    if (type !== 'custom') {
      throw new ValidationError('type must be one of: scorm, custom');
    }

    const exam = await Exam.findById(contentId);
    if (!exam) {
      throw new NotFoundError('Content not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const currentCourseDept = await resolveDepartmentId(
      Course,
      exam.course.toString(),
      'course'
    );
    ensureDepartmentScope(scope, currentCourseDept, 'Access denied for this content');

    const {
      title,
      description,
      customType,
      course,
      program,
      programLevel,
      academicTerm,
      academicYear,
      passMark,
      totalMark,
      duration,
      examDate,
      examTime,
      examStatus,
    } = req.body as Record<string, any>;

    if (course) {
      const courseDept = await resolveDepartmentId(Course, course, 'course');
      ensureDepartmentScope(scope, courseDept, 'Access denied for this course');
      exam.course = new mongoose.Types.ObjectId(course);
    }

    if (program) {
      const programDept = await resolveDepartmentId(Program, program, 'program');
      ensureDepartmentScope(scope, programDept, 'Access denied for this program');
      exam.program = new mongoose.Types.ObjectId(program);
    }

    if (programLevel) {
      const programLevelDept = await resolveDepartmentId(
        ProgramLevel,
        programLevel,
        'program level'
      );
      ensureDepartmentScope(scope, programLevelDept, 'Access denied for this program level');
      exam.programLevel = new mongoose.Types.ObjectId(programLevel);
    }

    if (academicTerm) {
      if (!mongoose.isValidObjectId(academicTerm)) {
        throw new ValidationError('Invalid academic term id');
      }
      exam.academicTerm = new mongoose.Types.ObjectId(academicTerm);
    }

    if (academicYear) {
      if (!mongoose.isValidObjectId(academicYear)) {
        throw new ValidationError('Invalid academic year id');
      }
      exam.academicYear = new mongoose.Types.ObjectId(academicYear);
    }

    if (title !== undefined) {
      exam.name = title;
    }
    if (description !== undefined) {
      exam.description = description;
    }
    if (customType !== undefined) {
      exam.examType = customType;
    }
    if (passMark !== undefined) {
      exam.passMark = passMark;
    }
    if (totalMark !== undefined) {
      exam.totalMark = totalMark;
    }
    if (duration !== undefined) {
      exam.duration = duration;
    }
    if (examDate !== undefined) {
      exam.examDate = examDate;
    }
    if (examTime !== undefined) {
      exam.examTime = examTime;
    }
    if (examStatus !== undefined) {
      exam.examStatus = examStatus;
    }

    await exam.save();

    res.status(200).json({
      status: 'success',
      message: 'Content updated successfully',
      data: exam,
    });
  }
);

export const createDepartmentProgram = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { name, description, duration, code, departmentId } = req.body as Record<string, any>;

    const existing = await Program.findOne({ name }).lean();
    if (existing) {
      throw new ValidationError('Program already exists');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    let resolvedDepartment =
      departmentId ||
      (req.userAuth as any)?.department?.toString() ||
      MASTER_DEPARTMENT_ID;

    if (resolvedDepartment) {
      if (!mongoose.isValidObjectId(resolvedDepartment)) {
        throw new ValidationError('Invalid department id');
      }
      ensureDepartmentScope(scope, resolvedDepartment, 'Access denied for this department');
    }

    const program = await Program.create({
      name,
      description,
      duration,
      code,
      department: resolvedDepartment ? new mongoose.Types.ObjectId(resolvedDepartment) : undefined,
      createdBy: req.userAuth?._id,
    });

    res.status(201).json({
      status: 'success',
      message: 'Program created successfully',
      data: program,
    });
  }
);

export const updateDepartmentProgram = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const programId = req.params.id;
    if (!mongoose.isValidObjectId(programId)) {
      throw new ValidationError('Invalid program id');
    }

    const program = await Program.findById(programId);
    if (!program) {
      throw new NotFoundError('Program not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const programDept = program.department ? program.department.toString() : null;
    ensureDepartmentScope(scope, programDept, 'Access denied for this program');

    const { name, description, duration, code } = req.body as Record<string, any>;
    if (name && name !== program.name) {
      const existing = await Program.findOne({ name }).lean();
      if (existing) {
        throw new ValidationError('Program already exists');
      }
      program.name = name;
    }

    if (description !== undefined) {
      program.description = description;
    }
    if (duration !== undefined) {
      program.duration = duration;
    }
    if (code !== undefined) {
      program.code = code;
    }

    await program.save();

    res.status(200).json({
      status: 'success',
      message: 'Program updated successfully',
      data: program,
    });
  }
);

export const updateProgramDepartment = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const programId = req.params.id;
    const { departmentId } = req.body as { departmentId: string | null };

    if (!mongoose.isValidObjectId(programId)) {
      throw new ValidationError('Invalid program id');
    }

    const program = await Program.findById(programId);
    if (!program) {
      throw new NotFoundError('Program not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const programDept = program.department ? program.department.toString() : null;
    ensureDepartmentScope(scope, programDept, 'Access denied for this program');

    if (departmentId === null) {
      if (scope && scope !== 'all') {
        throw new AuthorizationError('Access denied for this department change');
      }
      program.department = undefined;
    } else {
      if (!mongoose.isValidObjectId(departmentId)) {
        throw new ValidationError('Invalid department id');
      }
      ensureDepartmentScope(scope, departmentId, 'Access denied for this department');
      program.department = new mongoose.Types.ObjectId(departmentId);
    }

    await program.save();

    res.status(200).json({
      status: 'success',
      message: 'Program department updated successfully',
      data: program,
    });
  }
);

export const createDepartmentCourse = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { title, description, program, programLevel, departmentId } =
      req.body as Record<string, any>;

    const existing = await Course.findOne({ title, program }).lean();
    if (existing) {
      throw new ValidationError('Course already exists');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    let resolvedDepartment =
      departmentId ||
      (req.userAuth as any)?.department?.toString() ||
      MASTER_DEPARTMENT_ID;

    if (resolvedDepartment) {
      if (!mongoose.isValidObjectId(resolvedDepartment)) {
        throw new ValidationError('Invalid department id');
      }
      ensureDepartmentScope(scope, resolvedDepartment, 'Access denied for this department');
    }

    if (!mongoose.isValidObjectId(program)) {
      throw new ValidationError('Invalid program id');
    }
    const programDept = await resolveDepartmentId(Program, program, 'program');
    ensureDepartmentScope(scope, programDept, 'Access denied for this program');

    let programLevelObjectId: mongoose.Types.ObjectId | undefined;
    if (programLevel) {
      if (!mongoose.isValidObjectId(programLevel)) {
        throw new ValidationError('Invalid program level id');
      }
      const programLevelDept = await resolveDepartmentId(
        ProgramLevel,
        programLevel,
        'program level'
      );
      ensureDepartmentScope(scope, programLevelDept, 'Access denied for this program level');
      programLevelObjectId = new mongoose.Types.ObjectId(programLevel);
    }

    const course = await Course.create({
      title,
      description,
      department: resolvedDepartment ? new mongoose.Types.ObjectId(resolvedDepartment) : undefined,
      program: new mongoose.Types.ObjectId(program),
      programLevel: programLevelObjectId,
      createdBy: req.userAuth?._id,
    });

    res.status(201).json({
      status: 'success',
      message: 'Course created successfully',
      data: course,
    });
  }
);

export const updateDepartmentCourse = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const courseId = req.params.id;
    if (!mongoose.isValidObjectId(courseId)) {
      throw new ValidationError('Invalid course id');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const courseDept = course.department ? course.department.toString() : null;
    ensureDepartmentScope(scope, courseDept, 'Access denied for this course');

    const { title, description, program, programLevel } = req.body as Record<string, any>;

    if (title && title !== course.title) {
      const existing = await Course.findOne({ title, program: course.program }).lean();
      if (existing) {
        throw new ValidationError('Course already exists');
      }
      course.title = title;
    }

    if (description !== undefined) {
      course.description = description;
    }

    if (program !== undefined) {
      if (!mongoose.isValidObjectId(program)) {
        throw new ValidationError('Invalid program id');
      }
      const programDept = await resolveDepartmentId(Program, program, 'program');
      ensureDepartmentScope(scope, programDept, 'Access denied for this program');
      course.program = new mongoose.Types.ObjectId(program);
    }

    if (programLevel !== undefined) {
      if (programLevel === null) {
        course.programLevel = undefined;
      } else {
        if (!mongoose.isValidObjectId(programLevel)) {
          throw new ValidationError('Invalid program level id');
        }
        const programLevelDept = await resolveDepartmentId(
          ProgramLevel,
          programLevel,
          'program level'
        );
        ensureDepartmentScope(scope, programLevelDept, 'Access denied for this program level');
        course.programLevel = new mongoose.Types.ObjectId(programLevel);
      }
    }

    await course.save();

    res.status(200).json({
      status: 'success',
      message: 'Course updated successfully',
      data: course,
    });
  }
);

export const updateCourseDepartment = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const courseId = req.params.id;
    const { departmentId } = req.body as { departmentId: string | null };

    if (!mongoose.isValidObjectId(courseId)) {
      throw new ValidationError('Invalid course id');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const courseDept = course.department ? course.department.toString() : null;
    ensureDepartmentScope(scope, courseDept, 'Access denied for this course');

    if (departmentId === null) {
      if (scope && scope !== 'all') {
        throw new AuthorizationError('Access denied for this department change');
      }
      course.department = undefined;
    } else {
      if (!mongoose.isValidObjectId(departmentId)) {
        throw new ValidationError('Invalid department id');
      }
      ensureDepartmentScope(scope, departmentId, 'Access denied for this department');
      course.department = new mongoose.Types.ObjectId(departmentId);
    }

    await course.save();

    res.status(200).json({
      status: 'success',
      message: 'Course department updated successfully',
      data: course,
    });
  }
);

export const updateCourseProgram = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const courseId = req.params.id;
    const { programId } = req.body as { programId: string | null };

    if (!mongoose.isValidObjectId(courseId)) {
      throw new ValidationError('Invalid course id');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const courseDept = course.department ? course.department.toString() : null;
    ensureDepartmentScope(scope, courseDept, 'Access denied for this course');

    if (programId === null) {
      course.program = undefined;
    } else {
      if (!mongoose.isValidObjectId(programId)) {
        throw new ValidationError('Invalid program id');
      }
      const programDept = await resolveDepartmentId(Program, programId, 'program');
      ensureDepartmentScope(scope, programDept, 'Access denied for this program');
      if (courseDept && programDept && courseDept !== programDept) {
        throw new ValidationError('Program department must match course department');
      }
      course.program = new mongoose.Types.ObjectId(programId);
    }

    await course.save();

    res.status(200).json({
      status: 'success',
      message: 'Course program updated successfully',
      data: course,
    });
  }
);

export const updateDepartment = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const departmentId = req.params.id;
  if (!mongoose.isValidObjectId(departmentId)) {
    throw new ValidationError('Invalid department id');
  }

  const department = await Department.findById(departmentId);
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  const scope = req.departmentScope?.accessibleDepartmentIds;
  ensureDepartmentScope(scope, departmentId, 'Access denied for this department');

  const { name, code, passingStyleScore } = req.body as {
    name?: string;
    code?: string;
    passingStyleScore?: number | null;
  };
  if (name !== undefined) {
    department.name = name;
  }
  if (code !== undefined) {
    department.code = code;
  }
  if (passingStyleScore !== undefined) {
    if (passingStyleScore === null) {
      (department as any).passingStyleScore = null;
    } else if (
      typeof passingStyleScore !== 'number' ||
      Number.isNaN(passingStyleScore) ||
      passingStyleScore < 0 ||
      passingStyleScore > 100
    ) {
      throw new ValidationError('passingStyleScore must be a number between 0 and 100');
    } else {
      (department as any).passingStyleScore = passingStyleScore;
    }
  }

  await department.save();

  res.status(200).json({
    status: 'success',
    message: 'Department updated successfully',
    data: department,
  });
});
