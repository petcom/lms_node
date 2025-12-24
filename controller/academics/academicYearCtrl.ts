import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import AcademicYear from '../../model/Academic/AcademicYear';
import Admin from '../../model/Staff/Admin';
import { IAcademicYear, IAdmin } from '../../types/models';

interface CreateAcademicYearBody {
  name: string;
  fromYear: Date;
  toYear: Date;
}

interface UpdateAcademicYearBody {
  name?: string;
  fromYear?: Date;
  toYear?: Date;
  isCurrent?: boolean;
}

// Create Academic Year
export const createAcademicYear = AsyncHandler(async (req: Request<{}, {}, CreateAcademicYearBody>, res: Response): Promise<void> => {
  const { name, fromYear, toYear } = req.body;

  const existingYear = await AcademicYear.findOne({ name }).lean() as IAcademicYear | null;
  if (existingYear) {
    res.status(400).json({
      status: 'error',
      message: 'Academic year already exists',
    });
    return;
  }

  const academicYearCreated = await AcademicYear.create({
    name,
    fromYear,
    toYear,
    createdBy: req.userAuth?._id,
  }) as IAcademicYear;

  const admin = await Admin.findById(req.userAuth?._id) as IAdmin | null;
  if (admin) {
    admin.academicYears?.push(academicYearCreated._id);
    await admin.save();
  }

  res.status(201).json({
    status: 'success',
    message: 'Academic year created',
    data: academicYearCreated,
  });
});

// Get all Academic Years
export const getAcademicYears = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

// Get single Academic Year
export const getAcademicYear = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const academicYear = await AcademicYear.findById(req.params.id).lean() as IAcademicYear | null;

  if (!academicYear) {
    res.status(404).json({
      status: 'error',
      message: 'Academic year not found',
    });
    return;
  }

  res.status(200).json({
    status: 'success',
    message: 'Academic year fetched successfully',
    data: academicYear,
  });
});

// Update Academic Year
export const updateAcademicYear = AsyncHandler(async (req: Request<{ id: string }, {}, UpdateAcademicYearBody>, res: Response): Promise<void> => {
  const { name, fromYear, toYear, isCurrent } = req.body;

  if (name) {
    const existingWithName = await AcademicYear.findOne({ name }).lean() as IAcademicYear | null;
    if (existingWithName && existingWithName._id.toString() !== req.params.id) {
      res.status(400).json({
        status: 'error',
        message: 'Academic year already exists',
      });
      return;
    }
  }

  const updatePayload: Partial<IAcademicYear> = {};
  if (name !== undefined) updatePayload.name = name;
  if (fromYear !== undefined) updatePayload.fromYear = fromYear;
  if (toYear !== undefined) updatePayload.toYear = toYear;
  if (isCurrent !== undefined) updatePayload.isCurrent = isCurrent;

  const academicYear = await AcademicYear.findByIdAndUpdate(
    req.params.id,
    updatePayload,
    { new: true, runValidators: true }
  ).lean() as IAcademicYear | null;

  if (!academicYear) {
    res.status(404).json({
      status: 'error',
      message: 'Academic year not found',
    });
    return;
  }

  res.status(200).json({
    status: 'success',
    message: 'Academic year updated successfully',
    data: academicYear,
  });
});

// Delete Academic Year
export const deleteAcademicYear = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const academicYear = await AcademicYear.findByIdAndDelete(req.params.id).lean() as IAcademicYear | null;

  if (!academicYear) {
    res.status(404).json({
      status: 'error',
      message: 'Academic year not found',
    });
    return;
  }

  res.status(200).json({
    status: 'success',
    message: 'Academic year deleted successfully',
    data: academicYear,
  });
});
