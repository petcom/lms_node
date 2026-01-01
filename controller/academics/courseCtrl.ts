import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Course from '../../model/Content/Course';
import Program from '../../model/Academic/Program';
import { ICourse } from '../../types/models';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';

interface CreateCourseBody {
  title: string;
  description?: string;
  program: string;
  programLevel?: string;
  department?: string;
}

interface UpdateCourseBody {
  title?: string;
  description?: string;
  programLevel?: string | null;
  department?: string | null;
}

const assertScopeAccess = (scope: string[] | 'all' | undefined, departmentId?: string | null) => {
  if (!departmentId) return;
  if (scope && scope !== 'all' && !scope.includes(departmentId)) {
    throw new AuthorizationError('Access denied for this department');
  }
};

export const createCourse = AsyncHandler(
  async (req: Request<Record<string, never>, any, CreateCourseBody>, res: Response): Promise<void> => {
    const { title, description, program, programLevel, department } = req.body;

    const programDoc = await Program.findById(program).lean();
    if (!programDoc) {
      throw new NotFoundError('Program not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const programDepartment = programDoc.department?.toString();
    assertScopeAccess(scope, programDepartment);

    const duplicate = await Course.findOne({ program, title }).lean();
    if (duplicate) {
      throw new ValidationError('Course title already exists in this program');
    }

    const resolvedDepartment =
      department || programDepartment || (req.userAuth as any)?.department?.toString();

    const courseCreated = (await Course.create({
      title,
      description,
      program,
      programLevel: programLevel ? new mongoose.Types.ObjectId(programLevel) : undefined,
      department: resolvedDepartment ? new mongoose.Types.ObjectId(resolvedDepartment) : undefined,
      createdBy: req.userAuth?._id,
    })) as ICourse;

    res.status(201).json({
      status: 'success',
      message: 'Course created',
      data: courseCreated,
    });
  }
);

export const getCourses = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

export const getCourse = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const course = (await Course.findById(req.params.id)) as ICourse | null;
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (course as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    res.status(200).json({
      status: 'success',
      message: 'Course fetched successfully',
      data: course,
    });
  }
);

export const updateCourse = AsyncHandler(
  async (req: Request<{ id: string }, any, UpdateCourseBody>, res: Response): Promise<void> => {
    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (course as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    const { title, description, programLevel, department } = req.body;

    if (title) {
      const duplicate = await Course.findOne({
        _id: { $ne: course._id },
        program: course.program,
        title,
      }).lean();
      if (duplicate) {
        throw new ValidationError('Course title already exists in this program');
      }
    }

    if (department !== undefined) {
      const nextDept = department === null ? null : department;
      assertScopeAccess(scope, nextDept || undefined);
    }

    const updated = (await Course.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        programLevel:
          programLevel === null
            ? null
            : programLevel
              ? new mongoose.Types.ObjectId(programLevel)
              : course.programLevel,
        department:
          department === null
            ? null
            : department
              ? new mongoose.Types.ObjectId(department)
              : course.department,
      },
      { new: true }
    )) as ICourse | null;

    res.status(200).json({
      status: 'success',
      message: 'Course updated successfully',
      data: updated,
    });
  }
);

export const deleteCourse = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (course as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    await Course.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Course deleted successfully',
    });
  }
);

export const archiveCourse = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const course = (await Course.findById(req.params.id)) as ICourse | null;
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (course as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    if (!course.isArchived) {
      course.isArchived = true;
      course.archivedAt = new Date();
      await course.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Course archived successfully',
      data: course,
    });
  }
);

export const unarchiveCourse = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const course = (await Course.findById(req.params.id)) as ICourse | null;
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (course as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    if (course.isArchived) {
      course.isArchived = false;
      course.archivedAt = undefined;
      await course.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Course unarchived successfully',
      data: course,
    });
  }
);
