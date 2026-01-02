import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ClassModel from '../../model/Academic/Class';
import ClassEnrollment from '../../model/Academic/ClassEnrollment';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';

interface CreateClassEnrollmentBody {
  learner: string;
  classId: string;
  enrolledAt?: string;
}

interface UpdateClassEnrollmentBody {
  completedAt?: string;
  withdrawnAt?: string;
}

const assertScopeAccess = (scope: string[] | 'all' | undefined, departmentId?: string | null) => {
  if (!departmentId) return;
  if (scope && scope !== 'all' && !scope.includes(departmentId)) {
    throw new AuthorizationError('Access denied for this department');
  }
};

export const createClassEnrollment = AsyncHandler(
  async (req: Request<Record<string, never>, any, CreateClassEnrollmentBody>, res: Response) => {
    const { learner, classId, enrolledAt } = req.body;

    const classDoc = await ClassModel.findById(classId).lean();
    if (!classDoc) {
      throw new NotFoundError('Class not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = classDoc.department?.toString();
    assertScopeAccess(scope, departmentId);

    const existing = await ClassEnrollment.findOne({ learner, class: classId }).lean();
    if (existing) {
      throw new ValidationError('Learner already enrolled in class');
    }

    const enrollment = await ClassEnrollment.create({
      learner: new mongoose.Types.ObjectId(learner),
      class: new mongoose.Types.ObjectId(classId),
      program: classDoc.program,
      programLevel: classDoc.programLevel,
      enrolledAt: enrolledAt ? new Date(enrolledAt) : new Date(),
    });

    res.status(201).json({
      status: 'success',
      message: 'Class enrollment created',
      data: enrollment,
    });
  }
);

export const getClassEnrollments = AsyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(res.results);
});

export const getClassEnrollment = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const enrollment = await ClassEnrollment.findById(req.params.id);
    if (!enrollment) {
      throw new NotFoundError('Class enrollment not found');
    }

    const classDoc = await ClassModel.findById(enrollment.class).select('department').lean();
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = classDoc?.department?.toString();
    assertScopeAccess(scope, departmentId);

    res.status(200).json({
      status: 'success',
      message: 'Class enrollment fetched',
      data: enrollment,
    });
  }
);

export const updateClassEnrollment = AsyncHandler(
  async (req: Request<{ id: string }, any, UpdateClassEnrollmentBody>, res: Response) => {
    const enrollment = await ClassEnrollment.findById(req.params.id);
    if (!enrollment) {
      throw new NotFoundError('Class enrollment not found');
    }

    const classDoc = await ClassModel.findById(enrollment.class).select('department').lean();
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = classDoc?.department?.toString();
    assertScopeAccess(scope, departmentId);

    const { completedAt, withdrawnAt } = req.body;
    if (completedAt) enrollment.completedAt = new Date(completedAt);
    if (withdrawnAt) enrollment.withdrawnAt = new Date(withdrawnAt);

    await enrollment.save();

    res.status(200).json({
      status: 'success',
      message: 'Class enrollment updated',
      data: enrollment,
    });
  }
);

export const deleteClassEnrollment = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const enrollment = await ClassEnrollment.findById(req.params.id);
    if (!enrollment) {
      throw new NotFoundError('Class enrollment not found');
    }

    const classDoc = await ClassModel.findById(enrollment.class).select('department').lean();
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = classDoc?.department?.toString();
    assertScopeAccess(scope, departmentId);

    await ClassEnrollment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Class enrollment deleted',
    });
  }
);
