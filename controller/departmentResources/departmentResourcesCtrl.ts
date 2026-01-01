import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Admin from '../../model/Staff/Admin';
import Staff from '../../model/Staff/Staff';
import Department from '../../model/Academic/Department';
import ScormPackage from '../../model/Scorm/ScormPackage';
import Exam from '../../model/Academic/Exam';
import Subject from '../../model/Academic/Subject';
import { IDepartment } from '../../types/models';
import { AuthorizationError, ValidationError } from '../../utils/errors';

type DepartmentSummary = {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  level: number;
};

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'dept-admin' | 'staff';
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

const toDepartmentSummary = (dept: IDepartment): DepartmentSummary => ({
  id: dept._id.toString(),
  name: dept.name,
  code: dept.code ?? null,
  parentId: dept.parent ? dept.parent.toString() : null,
  level: getLevelNumber(dept.level),
});

const parsePagination = (req: Request): { skip: number; limit: number } | null => {
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  if (!Number.isFinite(page) || !Number.isFinite(limit)) {
    return null;
  }
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  return { skip: (safePage - 1) * safeLimit, limit: safeLimit };
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

const buildDepartmentMap = (departments: IDepartment[]): Map<string, DepartmentSummary> => {
  const map = new Map<string, DepartmentSummary>();
  departments.forEach((dept) => {
    map.set(dept._id.toString(), toDepartmentSummary(dept));
  });
  return map;
};

const buildDepartmentRecordMap = (departments: IDepartment[]): Map<string, IDepartment> => {
  const map = new Map<string, IDepartment>();
  departments.forEach((dept) => {
    map.set(dept._id.toString(), dept);
  });
  return map;
};

const getDepartmentRole = (department: IDepartment | null): 'admin' | 'dept-admin' => {
  if (!department) {
    return 'admin';
  }
  return department.level === 'master' ? 'admin' : 'dept-admin';
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

export const listStaffUsers = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { type, departmentId } = req.query as { type?: string; departmentId?: string };
  const { departmentIds, departments } = await resolveDepartmentScope(req, departmentId);

  const departmentMap = buildDepartmentMap(departments);
  const departmentRecordMap = buildDepartmentRecordMap(departments);
  const masterDeptId =
    departments.find((dept) => dept.level === 'master')?._id.toString() || MASTER_DEPARTMENT_ID;

  const adminFilter =
    departmentIds === null
      ? {}
      : { department: { $in: departmentIds.map((id) => new mongoose.Types.ObjectId(id)) } };
  const teacherFilter =
    departmentIds === null
      ? {}
      : { department: { $in: departmentIds.map((id) => new mongoose.Types.ObjectId(id)) } };

  const [admins, staffMembers] = await Promise.all([
    Admin.find(adminFilter).select('name email department').lean(),
    Staff.find(teacherFilter).select('name email department').lean(),
  ]);

  const adminItems: StaffUser[] = admins.map((admin) => {
    const deptId = admin.department ? admin.department.toString() : null;
    const deptSummary = deptId ? departmentMap.get(deptId) || null : null;
    const deptRecord = deptId ? departmentRecordMap.get(deptId) || null : null;
    const role = getDepartmentRole(deptRecord);
    const effectiveRole = deptId === masterDeptId ? 'admin' : role;
    return {
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: effectiveRole,
      department: deptSummary,
    };
  });

  const staffItems: StaffUser[] = staffMembers.map((staff) => {
    const deptId = staff.department ? staff.department.toString() : null;
    const deptSummary = deptId ? departmentMap.get(deptId) || null : null;
    return {
      id: staff._id.toString(),
      name: staff.name,
      email: staff.email,
      role: 'staff',
      department: deptSummary,
    };
  });

  let items: StaffUser[] = [];
  if (type === 'teacher') {
    items = staffItems;
  } else if (type === 'dept-admin') {
    items = adminItems.filter((admin) => admin.role === 'dept-admin');
  } else if (type === 'staff') {
    items = [...adminItems, ...staffItems];
  } else {
    items = [...adminItems, ...staffItems];
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  const pagination = parsePagination(req);
  if (pagination) {
    const paged = items.slice(pagination.skip, pagination.skip + pagination.limit);
    res.status(200).json({
      status: 'success',
      message: 'Staff users fetched successfully',
      items: paged,
    });
    return;
  }

  res.status(200).json({
    status: 'success',
    message: 'Staff users fetched successfully',
    items,
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

    const departmentMap = buildDepartmentMap(departments);

    const departmentObjectIds =
      departmentIds?.map((id) => new mongoose.Types.ObjectId(id)) ?? null;

    const scormFilter =
      departmentObjectIds === null ? {} : { department: { $in: departmentObjectIds } };
    const scormPromise =
      type && type !== 'scorm' ? Promise.resolve([]) : ScormPackage.find(scormFilter).lean();

    const subjectFilter =
      departmentObjectIds === null ? {} : { department: { $in: departmentObjectIds } };
    const subjectPromise = Subject.find(subjectFilter).select('_id department').lean();

    const [scormPackages, subjects] = await Promise.all([scormPromise, subjectPromise]);
  const subjectIds = subjects.map((subject) => subject._id);
  const subjectDepartmentMap = new Map<string, DepartmentSummary | null>();
  subjects.forEach((subject) => {
    const deptId = subject.department ? subject.department.toString() : null;
    subjectDepartmentMap.set(subject._id.toString(), deptId ? departmentMap.get(deptId) || null : null);
  });

    const examFilter: Record<string, any> = {};
    if (subjectIds.length > 0) {
      examFilter.subject = { $in: subjectIds };
    }

    const exams =
      type && type === 'scorm'
        ? []
        : await Exam.find(examFilter).select('name examType subject').lean();

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
      const subjectId = exam.subject ? exam.subject.toString() : '';
      const deptSummary = subjectDepartmentMap.get(subjectId) || null;
      items.push({
        id: exam._id.toString(),
        type: 'custom',
        customType: derivedCustomType,
        title: exam.name,
        department: deptSummary,
      });
    });

    const pagination = parsePagination(req);
    if (pagination) {
      const paged = items.slice(pagination.skip, pagination.skip + pagination.limit);
      res.status(200).json({
        status: 'success',
        message: 'Department content fetched successfully',
        items: paged,
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: 'Department content fetched successfully',
      items,
    });
  }
);

export const listDepartmentHierarchy = AsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { departments } = await resolveDepartmentScope(req);
    const nodes = new Map<string, DepartmentNode>();

    departments.forEach((dept) => {
      const summary = toDepartmentSummary(dept);
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
