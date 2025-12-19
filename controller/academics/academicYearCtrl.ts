import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import AcademicYear from '../../model/Academic/AcademicYear';
import Admin from '../../model/Staff/Admin';
import { IAcademicYear, IAdmin } from '../../types/models';

// Request body interfaces
interface CreateAcademicYearBody {
  name: string;
  fromYear: Date;
  toYear: Date;
}

interface UpdateAcademicYearBody {
  name?: string;
  fromYear?: Date;
  toYear?: Date;
}

/**
 * @description Create Academic Year
 * @route POST /api/admins/academic-years
 * @access Private
 */
export const createAcademicYear = AsyncHandler(async (req: Request<{}, {}, CreateAcademicYearBody>, res: Response): Promise<void> => {
  const { name, fromYear, toYear } = req.body;
  
  // check if the year exists
  const academicYear = await AcademicYear.findOne({ name }).lean() as IAcademicYear | null;
  if (academicYear) {
    throw new Error("Academic year already exists");
  }
  
  // create
  const academicYearCreated = await AcademicYear.create({
    name,
    fromYear,
    toYear,
    createdBy: req.userAuth?._id
  }) as IAcademicYear;
  
  // push academic year into Admin
  const admin = await Admin.findById(req.userAuth?._id) as IAdmin | null;
  if (admin) {
    admin.academicYears?.push(academicYearCreated._id);
    await admin.save();
  }

  res.status(201).json({
    status: 'success',
    message: "Academic year created",
    data: academicYearCreated,
  });
});

/**
 * @description Get All Academic Years
 * @route GET /api/admins/academic-years
 * @access Private
 */
export const getAcademicYears = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

/**
 * @description Get Single Academic Year
 * @route GET /api/admins/academic-years/:id
 * @access Private
 */
export const getAcademicYear = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const academicYear = await AcademicYear.findById(req.params.id).lean() as IAcademicYear | null;

  res.status(201).json({
    status: "success",
    message: "Academic year fetched successfully",
    data: academicYear
  });
});

/**
 * @description Update Academic Year
 * @route PUT /api/admins/academic-years/:id
 * @access Private
 */
export const updateAcademicYear = AsyncHandler(async (req: Request<{ id: string }, {}, UpdateAcademicYearBody>, res: Response): Promise<void> => {
  const { name, fromYear, toYear } = req.body;
  
  const createAcademicYearFound = await AcademicYear.findOne({ name }).lean() as IAcademicYear | null;
  if (createAcademicYearFound) {
    throw new Error("Academic year already exists");
  }
  
  const academicYear = await AcademicYear.findByIdAndUpdate(
    req.params.id,
    {
      name,
      fromYear,
      toYear,
      createdBy: req.userAuth?._id,
    },
    {
      new: true, // return updated user instead of original one
    }
  ) as IAcademicYear | null;

  res.status(201).json({
    status: "success",
    message: "Academic years updated successfully",
    data: academicYear,
  });
});

/**
 * @description Delete Academic Year
 * @route DELETE /api/admins/academic-years/:id
 * @access Private
 */
export const deleteAcademicYear = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  await AcademicYear.findByIdAndDelete(req.params.id);

  res.status(201).json({
    status: "success",
    message: "Academic years deleted successfully",
  });
});
