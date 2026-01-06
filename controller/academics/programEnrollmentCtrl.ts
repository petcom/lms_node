import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Program from '../../model/Academic/Program';
import ProgramEnrollment from '../../model/Academic/ProgramEnrollment';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';

interface CreateProgramEnrollmentBody {
  learner: string;
  program: string;
  status?: 'active' | 'completed' | 'withdrawn';
  enrolledAt?: string;
}

interface UpdateProgramEnrollmentBody {
  status?: 'active' | 'completed' | 'withdrawn';
  completedAt?: string;
  withdrawnAt?: string;
}

const assertScopeAccess = (scope: string[] | 'all' | undefined, departmentId?: string | null) => {
  if (!departmentId) return;
  if (scope && scope !== 'all' && !scope.includes(departmentId)) {
    throw new AuthorizationError('Access denied for this department');
  }
};

export const createProgramEnrollment = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, CreateProgramEnrollmentBody>,
    res: Response
  ): Promise<void> => {
    const { learner, program, status, enrolledAt } = req.body;

    const programDoc = await Program.findById(program).select('department').lean();
    if (!programDoc) {
      throw new NotFoundError('Program not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = programDoc.department?.toString();
    assertScopeAccess(scope, departmentId);

    const existing = await ProgramEnrollment.findOne({ learner, program }).lean();
    if (existing) {
      throw new ValidationError('Learner already enrolled in program');
    }

    const enrollment = await ProgramEnrollment.create({
      learner: new mongoose.Types.ObjectId(learner),
      program: new mongoose.Types.ObjectId(program),
      // DCV-026: default status changed from 'active' to 'enrolled'
      status: status || 'enrolled',
      enrolledAt: enrolledAt ? new Date(enrolledAt) : new Date(),
      completedAt: status === 'completed' ? new Date() : undefined,
      withdrawnAt: status === 'withdrawn' ? new Date() : undefined,
    });

    res.status(201).json({
      status: 'success',
      message: 'Program enrollment created',
      data: enrollment,
    });
  }
);

export const getProgramEnrollments = AsyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(res.results);
  }
);

export const getProgramEnrollment = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const enrollment = await ProgramEnrollment.findById(req.params.id);
    if (!enrollment) {
      throw new NotFoundError('Program enrollment not found');
    }

    const program = await Program.findById(enrollment.program).select('department').lean();
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = program?.department?.toString();
    assertScopeAccess(scope, departmentId);

    res.status(200).json({
      status: 'success',
      message: 'Program enrollment fetched',
      data: enrollment,
    });
  }
);

export const updateProgramEnrollment = AsyncHandler(
  async (
    req: Request<{ id: string }, any, UpdateProgramEnrollmentBody>,
    res: Response
  ): Promise<void> => {
    const enrollment = await ProgramEnrollment.findById(req.params.id);
    if (!enrollment) {
      throw new NotFoundError('Program enrollment not found');
    }

    const program = await Program.findById(enrollment.program).select('department').lean();
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = program?.department?.toString();
    assertScopeAccess(scope, departmentId);

    const { status, completedAt, withdrawnAt } = req.body;

    if (status) {
      enrollment.status = status;
      if (status === 'completed' && !enrollment.completedAt) {
        enrollment.completedAt = completedAt ? new Date(completedAt) : new Date();
      }
      if (status === 'withdrawn' && !enrollment.withdrawnAt) {
        enrollment.withdrawnAt = withdrawnAt ? new Date(withdrawnAt) : new Date();
      }
    }

    if (completedAt) {
      enrollment.completedAt = new Date(completedAt);
    }
    if (withdrawnAt) {
      enrollment.withdrawnAt = new Date(withdrawnAt);
    }

    await enrollment.save();

    res.status(200).json({
      status: 'success',
      message: 'Program enrollment updated',
      data: enrollment,
    });
  }
);

export const deleteProgramEnrollment = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const enrollment = await ProgramEnrollment.findById(req.params.id);
    if (!enrollment) {
      throw new NotFoundError('Program enrollment not found');
    }

    const program = await Program.findById(enrollment.program).select('department').lean();
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const departmentId = program?.department?.toString();
    assertScopeAccess(scope, departmentId);

    await ProgramEnrollment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Program enrollment deleted',
    });
  }
);
