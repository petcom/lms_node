import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Course from '../../model/Content/Course';
import CourseContent from '../../model/Academic/CourseContent';
import Program from '../../model/Academic/Program';
import { ICourseContent } from '../../types/models-types';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';

interface CreateCourseContentBody {
  course: string;
  contentType: 'scorm' | 'custom';
  scormPackageId?: string;
  customContentId?: string;
  order?: number;
  isRequired?: boolean;
  shortDescription?: string;
  longDescription?: string;
}

interface UpdateCourseContentBody {
  contentType?: 'scorm' | 'custom';
  scormPackageId?: string | null;
  customContentId?: string | null;
  order?: number;
  isRequired?: boolean;
  shortDescription?: string;
  longDescription?: string;
}

const assertScopeAccess = (scope: string[] | 'all' | undefined, departmentId?: string | null) => {
  if (!departmentId) return;
  if (scope && scope !== 'all' && !scope.includes(departmentId)) {
    throw new AuthorizationError('Access denied for this department');
  }
};

// DCV-044: Helper to get department from Course via Program
const getCourseDepartment = async (courseId: mongoose.Types.ObjectId | string): Promise<string | undefined> => {
  const course = await Course.findById(courseId).select('program').lean();
  if (!course?.program) return undefined;
  const program = await Program.findById(course.program).select('department').lean();
  return (program as any)?.department?.toString();
};

const validateContentType = (body: CreateCourseContentBody | UpdateCourseContentBody) => {
  if (body.contentType === 'scorm') {
    if (!body.scormPackageId) {
      throw new ValidationError('scormPackageId is required for scorm content');
    }
  }
  if (body.contentType === 'custom') {
    if (!body.customContentId) {
      throw new ValidationError('customContentId is required for custom content');
    }
  }
};

export const createCourseContent = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, CreateCourseContentBody>,
    res: Response
  ): Promise<void> => {
    const {
      course,
      contentType,
      scormPackageId,
      customContentId,
      order,
      isRequired,
      shortDescription,
      longDescription,
    } = req.body;

    const courseDoc = await Course.findById(course).lean();
    if (!courseDoc) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = (courseDoc as any)?.department?.toString();
    assertScopeAccess(scope, departmentId);

    validateContentType({ contentType, scormPackageId, customContentId, course });

    const existing = await CourseContent.findOne({
      course,
      contentType,
      scormPackageId: contentType === 'scorm' ? scormPackageId : undefined,
      customContentId: contentType === 'custom' ? customContentId : undefined,
    }).lean();
    if (existing) {
      throw new ValidationError('Content already exists for this course');
    }

    const nextOrder =
      typeof order === 'number' && order > 0
        ? order
        : (await CourseContent.countDocuments({ course })) + 1;

    const created = (await CourseContent.create({
      course,
      shortDescription,
      longDescription,
      contentType,
      scormPackageId: scormPackageId ? new mongoose.Types.ObjectId(scormPackageId) : undefined,
      customContentId: customContentId ? new mongoose.Types.ObjectId(customContentId) : undefined,
      order: nextOrder,
      isRequired: isRequired !== undefined ? isRequired : true,
      createdBy: req.userAuth?._id,
    })) as ICourseContent;

    res.status(201).json({
      status: 'success',
      message: 'Course content created',
      data: created,
    });
  }
);

export const getCourseContents = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

export const getCourseContent = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const content = (await CourseContent.findById(req.params.id)) as ICourseContent | null;
    if (!content) {
      throw new NotFoundError('Course content not found');
    }

    // DCV-044: Get department via Program
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = await getCourseDepartment(content.course);
    assertScopeAccess(scope, departmentId);

    res.status(200).json({
      status: 'success',
      message: 'Course content fetched successfully',
      data: content,
    });
  }
);

export const updateCourseContent = AsyncHandler(
  async (
    req: Request<{ id: string }, any, UpdateCourseContentBody>,
    res: Response
  ): Promise<void> => {
    const content = await CourseContent.findById(req.params.id);
    if (!content) {
      throw new NotFoundError('Course content not found');
    }

    // DCV-044: Get department via Program
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = await getCourseDepartment(content.course);
    assertScopeAccess(scope, departmentId);

    const {
      contentType,
      scormPackageId,
      customContentId,
      order,
      isRequired,
      shortDescription,
      longDescription,
    } = req.body;

    if (contentType) {
      validateContentType({
        contentType,
        scormPackageId: scormPackageId || undefined,
        customContentId: customContentId || undefined,
        course: content.course.toString(),
      });
    }

    const updated = (await CourseContent.findByIdAndUpdate(
      req.params.id,
      {
        shortDescription: shortDescription ?? content.shortDescription,
        longDescription: longDescription ?? content.longDescription,
        contentType: contentType || content.contentType,
        scormPackageId:
          scormPackageId === null
            ? undefined
            : scormPackageId
              ? new mongoose.Types.ObjectId(scormPackageId)
              : content.scormPackageId,
        customContentId:
          customContentId === null
            ? undefined
            : customContentId
              ? new mongoose.Types.ObjectId(customContentId)
              : content.customContentId,
        order: order ?? content.order,
        isRequired: isRequired ?? content.isRequired,
      },
      { new: true }
    )) as ICourseContent | null;

    res.status(200).json({
      status: 'success',
      message: 'Course content updated successfully',
      data: updated,
    });
  }
);

export const deleteCourseContent = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const content = await CourseContent.findById(req.params.id);
    if (!content) {
      throw new NotFoundError('Course content not found');
    }

    // DCV-044: Get department via Program
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = await getCourseDepartment(content.course);
    assertScopeAccess(scope, departmentId);

    await CourseContent.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Course content deleted successfully',
    });
  }
);
