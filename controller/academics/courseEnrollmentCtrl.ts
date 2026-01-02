import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Course from '../../model/Content/Course';
import ClassModel from '../../model/Academic/Class';
import CourseEnrollment from '../../model/Academic/CourseEnrollment';
import ProgramEnrollment from '../../model/Academic/ProgramEnrollment';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';

interface CreateCourseEnrollmentBody {
  learner: string;
  course: string;
  classId?: string;
  status?: 'active' | 'completed' | 'withdrawn';
  progress?: number;
  startedAt?: string;
}

interface UpdateCourseEnrollmentBody {
  status?: 'active' | 'completed' | 'withdrawn';
  progress?: number;
  completedAt?: string;
}

const assertScopeAccess = (scope: string[] | 'all' | undefined, departmentId?: string | null) => {
  if (!departmentId) return;
  if (scope && scope !== 'all' && !scope.includes(departmentId)) {
    throw new AuthorizationError('Access denied for this department');
  }
};

const updateProgramEnrollmentStatus = async (
  learnerId: mongoose.Types.ObjectId,
  programId: mongoose.Types.ObjectId
) => {
  const programEnrollment = await ProgramEnrollment.findOne({
    learner: learnerId,
    program: programId,
  });
  if (!programEnrollment || programEnrollment.status === 'withdrawn') {
    return;
  }

  const totalCourses = await Course.countDocuments({ program: programId });
  if (totalCourses === 0) {
    return;
  }

  const completedCourses = await CourseEnrollment.countDocuments({
    learner: learnerId,
    program: programId,
    status: 'completed',
  });

  if (completedCourses >= totalCourses) {
    if (programEnrollment.status !== 'completed') {
      programEnrollment.status = 'completed';
      programEnrollment.completedAt = programEnrollment.completedAt || new Date();
      await programEnrollment.save();
    }
    return;
  }

  if (programEnrollment.status === 'completed') {
    programEnrollment.status = 'active';
    programEnrollment.completedAt = undefined;
    await programEnrollment.save();
  }
};

export const createCourseEnrollment = AsyncHandler(
  async (req: Request<Record<string, never>, any, CreateCourseEnrollmentBody>, res: Response) => {
    const { learner, course, classId, status, progress, startedAt } = req.body;

    const courseDoc = await Course.findById(course).lean();
    if (!courseDoc) {
      throw new NotFoundError('Course not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = courseDoc.department?.toString();
    assertScopeAccess(scope, departmentId);

    let classDoc: any = null;
    if (classId) {
      classDoc = await ClassModel.findById(classId).lean();
      if (!classDoc) {
        throw new NotFoundError('Class not found');
      }
      if (classDoc.program?.toString() !== courseDoc.program?.toString()) {
        throw new ValidationError('Class program does not match course program');
      }
    }

    const existing = await CourseEnrollment.findOne({ learner, course }).lean();
    if (existing) {
      throw new ValidationError('Learner already enrolled in course');
    }

    const enrollment = await CourseEnrollment.create({
      learner: new mongoose.Types.ObjectId(learner),
      course: new mongoose.Types.ObjectId(course),
      program: courseDoc.program,
      programLevel: courseDoc.programLevel,
      class: classDoc ? classDoc._id : undefined,
      status: status || 'active',
      progress: typeof progress === 'number' ? progress : 0,
      startedAt: startedAt ? new Date(startedAt) : undefined,
      completedAt: status === 'completed' ? new Date() : undefined,
    });

    await updateProgramEnrollmentStatus(enrollment.learner, enrollment.program);

    res.status(201).json({
      status: 'success',
      message: 'Course enrollment created',
      data: enrollment,
    });
  }
);

export const getCourseEnrollments = AsyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(res.results);
});

export const getCourseEnrollment = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const enrollment = await CourseEnrollment.findById(req.params.id);
    if (!enrollment) {
      throw new NotFoundError('Course enrollment not found');
    }

    const courseDoc = await Course.findById(enrollment.course).select('department').lean();
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = courseDoc?.department?.toString();
    assertScopeAccess(scope, departmentId);

    res.status(200).json({
      status: 'success',
      message: 'Course enrollment fetched',
      data: enrollment,
    });
  }
);

export const updateCourseEnrollment = AsyncHandler(
  async (req: Request<{ id: string }, any, UpdateCourseEnrollmentBody>, res: Response) => {
    const enrollment = await CourseEnrollment.findById(req.params.id);
    if (!enrollment) {
      throw new NotFoundError('Course enrollment not found');
    }

    const courseDoc = await Course.findById(enrollment.course).select('department').lean();
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = courseDoc?.department?.toString();
    assertScopeAccess(scope, departmentId);

    const { status, progress, completedAt } = req.body;
    if (status) {
      enrollment.status = status;
      if (status === 'completed' && !enrollment.completedAt) {
        enrollment.completedAt = completedAt ? new Date(completedAt) : new Date();
      }
    }
    if (typeof progress === 'number') {
      enrollment.progress = progress;
    }
    if (completedAt) {
      enrollment.completedAt = new Date(completedAt);
    }

    await enrollment.save();

    await updateProgramEnrollmentStatus(enrollment.learner, enrollment.program);

    res.status(200).json({
      status: 'success',
      message: 'Course enrollment updated',
      data: enrollment,
    });
  }
);

export const deleteCourseEnrollment = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const enrollment = await CourseEnrollment.findById(req.params.id);
    if (!enrollment) {
      throw new NotFoundError('Course enrollment not found');
    }

    const courseDoc = await Course.findById(enrollment.course).select('department').lean();
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = courseDoc?.department?.toString();
    assertScopeAccess(scope, departmentId);

    await CourseEnrollment.findByIdAndDelete(req.params.id);

    await updateProgramEnrollmentStatus(enrollment.learner, enrollment.program);

    res.status(200).json({
      status: 'success',
      message: 'Course enrollment deleted',
    });
  }
);
