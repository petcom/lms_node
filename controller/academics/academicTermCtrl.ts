import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import Admin from '../../model/Staff/Admin';
import AcademicTerm from '../../model/Academic/AcademicTerm';
import { IAcademicTerm, IAdmin } from '../../types/models';

// Request body interfaces
interface CreateAcademicTermBody {
  name: string;
  description?: string;
  duration: string;
}

interface UpdateAcademicTermBody {
  name?: string;
  description?: string;
  duration?: string;
}

/**
 * @description Create Academic Term
 * @route POST /api/admins/academic-terms
 * @access Private
 */
export const createAcademicTerm = AsyncHandler(async (req: Request<{}, {}, CreateAcademicTermBody>, res: Response): Promise<void> => {
  const { name, description, duration } = req.body;
  
  // check if the term exists
  const academicTerm = await AcademicTerm.findOne({ name }).lean() as IAcademicTerm | null;
  if (academicTerm) {
    throw new Error("Academic term already exists");
  }
  
  // create
  const academicTermCreated = await AcademicTerm.create({
    name,
    description,
    duration,
    createdBy: req.userAuth?._id
  }) as IAcademicTerm;
  
  // push academic term into Admin
  const admin = await Admin.findById(req.userAuth?._id) as IAdmin | null;
  if (admin) {
    admin.academicTerms?.push(academicTermCreated._id); // push the created term ID to the admin instance upon creation.
    await admin.save();
  }

  res.status(201).json({
    status: 'success',
    message: "Academic term created",
    data: academicTermCreated,
  });
});

/**
 * @description Get All Academic Terms
 * @route GET /api/admins/academic-terms
 * @access Private
 */
export const getAcademicTerms = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

/**
 * @description Get Single Academic Term
 * @route GET /api/admins/academic-terms/:id
 * @access Private
 */
export const getAcademicTerm = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const academicTerm = await AcademicTerm.findById(req.params.id) as IAcademicTerm | null;

  res.status(201).json({
    status: "success",
    message: "Academic Term fetched successfully",
    data: academicTerm
  });
});

/**
 * @description Update Academic Term
 * @route PUT /api/admins/academic-terms/:id
 * @access Private
 */
export const updateAcademicTerms = AsyncHandler(async (req: Request<{ id: string }, {}, UpdateAcademicTermBody>, res: Response): Promise<void> => {
  const { name, description, duration } = req.body;
  
  const createAcademicTermFound = await AcademicTerm.findOne({ name }) as IAcademicTerm | null;
  if (createAcademicTermFound) {
    throw new Error("Academic term already exists");
  }
  
  const academicTerm = await AcademicTerm.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      duration,
      createdBy: req.userAuth?._id,
    },
    {
      new: true, // return updated user instead of original one
    }
  ) as IAcademicTerm | null;

  res.status(201).json({
    status: "success",
    message: "Academic term updated successfully",
    data: academicTerm,
  });
});

/**
 * @description Delete Academic Term
 * @route DELETE /api/admins/academic-terms/:id
 * @access Private
 */
export const deleteAcademicTerm = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  await AcademicTerm.findByIdAndDelete(req.params.id);

  res.status(201).json({
    status: "success",
    message: "Academic term deleted successfully",
  });
});
