import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Course from '../../model/Content/Course';
import CourseContent from '../../model/Academic/CourseContent';
import Program from '../../model/Academic/Program';
import ProgramLevel from '../../model/Academic/ProgramLevel';
import { ICourse } from '../../types/models-types';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';
import RenderedCourse from '../../model/Content/RenderedCourse';
import { invalidateProgramCatalog } from '../../utils/courseCatalogCache';

interface CreateCourseBody {
  title: string;
  description?: string;
  shortDescription?: string;
  longDescription?: string;
  program: string;
  programLevel?: string;
  department?: string;
  primaryInstructors?: string[];
  secondaryInstructors?: string[];
}

interface UpdateCourseBody {
  title?: string;
  description?: string;
  shortDescription?: string;
  longDescription?: string;
  programLevel?: string | null;
  department?: string | null;
  status?: 'draft' | 'rendered' | 'published';
  primaryInstructors?: string[];
  secondaryInstructors?: string[];
}

const assertScopeAccess = (scope: string[] | 'all' | undefined, departmentId?: string | null) => {
  if (!departmentId) return;
  if (scope && scope !== 'all' && !scope.includes(departmentId)) {
    throw new AuthorizationError('Access denied for this department');
  }
};

export const createCourse = AsyncHandler(
  async (req: Request<Record<string, never>, any, CreateCourseBody>, res: Response): Promise<void> => {
    const {
      title,
      description,
      shortDescription,
      longDescription,
      program,
      programLevel,
      department,
      primaryInstructors,
      secondaryInstructors,
    } = req.body;

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
      shortDescription,
      longDescription: longDescription ?? description,
      program,
      programLevel: programLevel ? new mongoose.Types.ObjectId(programLevel) : undefined,
      department: resolvedDepartment ? new mongoose.Types.ObjectId(resolvedDepartment) : undefined,
      primaryInstructors: primaryInstructors?.map((id) => new mongoose.Types.ObjectId(id)),
      secondaryInstructors: secondaryInstructors?.map((id) => new mongoose.Types.ObjectId(id)),
      createdBy: req.userAuth?._id,
    })) as ICourse;

    if (programLevel) {
      await ProgramLevel.findByIdAndUpdate(programLevel, {
        $addToSet: { courses: courseCreated._id },
      });
    }

    await invalidateProgramCatalog(program.toString());

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
    const course = (await Course.findById(req.params.id).lean()) as ICourse | null;
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (course as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    // Fetch segments (CourseContent) for this course, ordered by order field
    const segments = await CourseContent.find({ course: course._id })
      .sort({ order: 1 })
      .lean();

    res.status(200).json({
      status: 'success',
      message: 'Course fetched successfully',
      data: {
        ...course,
        segments,
      },
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

    const {
      title,
      description,
      shortDescription,
      longDescription,
      programLevel,
      department,
      status,
      primaryInstructors,
      secondaryInstructors,
    } = req.body;

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

    const nextProgramLevel =
      programLevel === null
        ? null
        : programLevel
          ? new mongoose.Types.ObjectId(programLevel)
          : course.programLevel;

    const updates: Record<string, any> = {
      title,
      description,
      programLevel: nextProgramLevel,
      department:
        department === null
          ? null
          : department
            ? new mongoose.Types.ObjectId(department)
            : course.department,
    };

    if (shortDescription !== undefined) {
      updates.shortDescription = shortDescription;
    }
    if (longDescription !== undefined || description !== undefined) {
      updates.longDescription = longDescription ?? description;
    }

    if (status) {
      const currentStatus = course.status || 'draft';
      const allowedTransitions: Record<string, string[]> = {
        draft: ['rendered'],
        rendered: ['published'],
        published: ['rendered'],
      };

      if (!allowedTransitions[currentStatus]?.includes(status)) {
        throw new ValidationError(
          `Invalid status transition from ${currentStatus} to ${status}`
        );
      }

      if (status === 'published') {
        const rendered = await RenderedCourse.findOne({ courseId: course._id })
          .select('_id')
          .lean();
        if (!rendered) {
          throw new ValidationError('Course must be rendered before publishing');
        }
      }

      updates.status = status;
      if (status === 'published') {
        updates.publishedAt = new Date();
        updates.publishedBy = req.userAuth?._id;
      } else {
        updates.publishedAt = undefined;
        updates.publishedBy = undefined;
      }
    }

    if (primaryInstructors) {
      updates.primaryInstructors = primaryInstructors.map((id) => new mongoose.Types.ObjectId(id));
    }
    if (secondaryInstructors) {
      updates.secondaryInstructors = secondaryInstructors.map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    const updated = (await Course.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    )) as ICourse | null;

    if (programLevel !== undefined) {
      const previousLevelId = course.programLevel?.toString();
      const nextLevelId = nextProgramLevel ? nextProgramLevel.toString() : undefined;

      if (previousLevelId && previousLevelId !== nextLevelId) {
        await ProgramLevel.findByIdAndUpdate(previousLevelId, {
          $pull: { courses: course._id },
        });
      }
      if (nextLevelId) {
        await ProgramLevel.findByIdAndUpdate(nextLevelId, {
          $addToSet: { courses: course._id },
        });
      }
    }

    await invalidateProgramCatalog(course.program?.toString());

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

    if (course.programLevel) {
      await ProgramLevel.findByIdAndUpdate(course.programLevel, {
        $pull: { courses: course._id },
      });
    }

    await invalidateProgramCatalog(course.program?.toString());

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

export const publishCourse = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (course as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    if (course.status === 'draft') {
      throw new ValidationError('Course must be rendered before publishing');
    }

    // Check for rendered course using courseId field
    const rendered = await RenderedCourse.findOne({ courseId: course._id }).select('_id').lean();
    if (!rendered) {
      throw new ValidationError('Course must be rendered before publishing');
    }

    // Validate at least one primary instructor exists
    if (!course.primaryInstructors || course.primaryInstructors.length === 0) {
      throw new ValidationError('Course must have at least one primary instructor before publishing');
    }

    if (course.status !== 'published') {
      course.status = 'published';
      course.publishedAt = new Date();
      course.publishedBy = req.userAuth?._id;
      await course.save();
    }

    await invalidateProgramCatalog(course.program?.toString());

    res.status(200).json({
      status: 'success',
      message: 'Course published successfully',
      data: course,
    });
  }
);

export const unpublishCourse = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const course = await Course.findById(req.params.id);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (course as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    if (course.status === 'published') {
      course.status = 'rendered';
      course.publishedAt = undefined;
      course.publishedBy = undefined;
      await course.save();
    }

    await invalidateProgramCatalog(course.program?.toString());

    res.status(200).json({
      status: 'success',
      message: 'Course unpublished successfully',
      data: course,
    });
  }
);
