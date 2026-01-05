import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Admin from '../../model/Staff/Admin';
import Program from '../../model/Academic/Program';
import ProgramLevel from '../../model/Academic/ProgramLevel';
import Course from '../../model/Content/Course';
import { IAdmin, IProgramLevel } from '../../types/models-types';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';

const MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

interface CreateProgramLevelBody {
  program: string;
  name: string;
  description?: string;
  order: number;
  department?: string;
  courses?: string[];
}

interface UpdateProgramLevelBody {
  name?: string;
  description?: string;
  order?: number;
  department?: string | null;
  courses?: string[];
}

const assertScopeAccess = (scope: string[] | 'all' | undefined, departmentId?: string | null) => {
  if (!departmentId) return;
  if (scope && scope !== 'all' && !scope.includes(departmentId)) {
    throw new AuthorizationError('Access denied for this department');
  }
};

const normalizeCourses = async (courses: string[] | undefined, programId: string) => {
  if (!courses) return undefined;
  const uniqueIds = Array.from(new Set(courses));
  const invalidId = uniqueIds.find((id) => !mongoose.isValidObjectId(id));
  if (invalidId) {
    throw new ValidationError('Invalid course id');
  }
  const courseDocs = await Course.find({ _id: { $in: uniqueIds } })
    .select('program')
    .lean();
  if (courseDocs.length !== uniqueIds.length) {
    throw new ValidationError('One or more courses not found');
  }
  const invalidProgram = courseDocs.find((course) => course.program?.toString() !== programId);
  if (invalidProgram) {
    throw new ValidationError('Course does not belong to this program');
  }
  return uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
};

export const createProgramLevel = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, CreateProgramLevelBody>,
    res: Response
  ): Promise<void> => {
    const { program, name, description, order, department, courses } = req.body;

    const programDoc = await Program.findById(program).lean();
    if (!programDoc) {
      throw new NotFoundError('Program not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const programDepartment = programDoc.department?.toString();
    assertScopeAccess(scope, programDepartment);

    const duplicate = await ProgramLevel.findOne({ program, order }).lean();
    if (duplicate) {
      throw new ValidationError('Program level order already exists for this program');
    }

    const resolvedDepartment =
      department || programDepartment || (req.userAuth as any)?.department?.toString();

    const normalizedCourses = await normalizeCourses(courses, program);

    const programLevelCreated = (await ProgramLevel.create({
      program,
      name,
      description,
      order,
      department:
        resolvedDepartment || programDepartment
          ? new mongoose.Types.ObjectId(resolvedDepartment || programDepartment)
          : new mongoose.Types.ObjectId(MASTER_DEPARTMENT_ID),
      createdBy: req.userAuth?._id,
      courses: normalizedCourses,
    })) as IProgramLevel;

    if (normalizedCourses && normalizedCourses.length > 0) {
      await Course.updateMany(
        { _id: { $in: normalizedCourses } },
        { $set: { programLevel: programLevelCreated._id } }
      );
    }

    const admin = (await Admin.findById(req.userAuth?._id)) as IAdmin | null;
    if (admin) {
      admin.programLevels = admin.programLevels || [];
      admin.programLevels.push(programLevelCreated._id);
      await admin.save();
    }

    res.status(201).json({
      status: 'success',
      message: 'Program level created',
      data: programLevelCreated,
    });
  }
);

export const getProgramLevels = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

export const getProgramLevel = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const programLevel = (await ProgramLevel.findById(req.params.id)) as IProgramLevel | null;
    if (!programLevel) {
      throw new NotFoundError('Program level not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (programLevel as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    res.status(200).json({
      status: 'success',
      message: 'Program level fetched successfully',
      data: programLevel,
    });
  }
);

export const updateProgramLevel = AsyncHandler(
  async (
    req: Request<{ id: string }, any, UpdateProgramLevelBody>,
    res: Response
  ): Promise<void> => {
    const existing = await ProgramLevel.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('Program level not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (existing as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    const { name, description, order, department, courses } = req.body;

    if (order !== undefined) {
      const duplicate = await ProgramLevel.findOne({
        _id: { $ne: existing._id },
        program: existing.program,
        order,
      }).lean();
      if (duplicate) {
        throw new ValidationError('Program level order already exists for this program');
      }
    }

    if (department !== undefined) {
      const nextDept = department === null ? null : department;
      assertScopeAccess(scope, nextDept || undefined);
    }

    const normalizedCourses = await normalizeCourses(courses, existing.program.toString());

    const updated = (await ProgramLevel.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        order,
        department:
          department === null
            ? null
            : department
              ? new mongoose.Types.ObjectId(department)
              : existing.department,
        courses: normalizedCourses ?? existing.courses,
      },
      { new: true }
    )) as IProgramLevel | null;

    if (normalizedCourses) {
      const previousCourseIds = (existing.courses || []).map((id) => id.toString());
      const nextCourseIds = normalizedCourses.map((id) => id.toString());
      const removedIds = previousCourseIds.filter((id) => !nextCourseIds.includes(id));

      if (removedIds.length > 0) {
        await Course.updateMany(
          { _id: { $in: removedIds } },
          { $set: { programLevel: null } }
        );
      }

      if (normalizedCourses.length > 0) {
        await Course.updateMany(
          { _id: { $in: normalizedCourses } },
          { $set: { programLevel: existing._id } }
        );
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Program level updated successfully',
      data: updated,
    });
  }
);

export const deleteProgramLevel = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const existing = await ProgramLevel.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('Program level not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (existing as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    if (existing.courses && existing.courses.length > 0) {
      await Course.updateMany(
        { _id: { $in: existing.courses } },
        { $set: { programLevel: null } }
      );
    }

    await ProgramLevel.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Program level deleted successfully',
    });
  }
);

export const archiveProgramLevel = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const programLevel = (await ProgramLevel.findById(req.params.id)) as IProgramLevel | null;
    if (!programLevel) {
      throw new NotFoundError('Program level not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (programLevel as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    if (!programLevel.archived) {
      programLevel.archived = true;
      programLevel.archivedAt = new Date();
      await programLevel.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Program level archived successfully',
      data: programLevel,
    });
  }
);

export const unarchiveProgramLevel = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const programLevel = (await ProgramLevel.findById(req.params.id)) as IProgramLevel | null;
    if (!programLevel) {
      throw new NotFoundError('Program level not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (programLevel as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    if (programLevel.archived) {
      programLevel.archived = false;
      programLevel.archivedAt = undefined;
      await programLevel.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Program level unarchived successfully',
      data: programLevel,
    });
  }
);
