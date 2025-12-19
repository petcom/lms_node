import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import Admin from '../../model/Staff/Admin';
import Program from '../../model/Academic/Program';
import { IProgram, IAdmin } from '../../types/models';

// Request body interfaces
interface CreateProgramBody {
  name: string;
  description?: string;
}

interface UpdateProgramBody {
  name?: string;
  description?: string;
}

/**
 * @description Create Program
 * @route POST /api/admins/programs
 * @access Private
 */
export const createProgram = AsyncHandler(async (req: Request<{}, {}, CreateProgramBody>, res: Response): Promise<void> => {
  const { name, description } = req.body;
  
  // check if the program exists
  const programFound = await Program.findOne({ name }).lean() as IProgram | null;
  if (programFound) {
    throw new Error("Program  already exists");
  }
  
  // create
  const programCreated = await Program.create({
    name,
    description,
    createdBy: req.userAuth?._id
  }) as IProgram;

  const admin = await Admin.findById(req.userAuth?._id) as IAdmin | null;
  if (admin) {
    // push program object into logged in Admin
    admin.programs?.push(programCreated._id); // push the created program ID to the admin instance upon creation.
    await admin.save();
  }

  res.status(201).json({
    status: "success",
    message: "Program Created Successfully",
    data: programCreated,
  });
});

/**
 * @description Get All Programs
 * @route GET /api/admins/programs
 * @access Private
 */
export const getPrograms = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

/**
 * @description Get Single Program
 * @route GET /api/admins/programs/:id
 * @access Private
 */
export const getSingleProgram = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const singleProgram = await Program.findById(req.params.id) as IProgram | null;

  res.status(201).json({
    status: "success",
    message: "Single Program fetched successfully",
    data: singleProgram
  });
});

/**
 * @description Update Program
 * @route PUT /api/admins/programs/:id
 * @access Private
 */
export const updateProgram = AsyncHandler(async (req: Request<{ id: string }, {}, UpdateProgramBody>, res: Response): Promise<void> => {
  const { name, description } = req.body;
  
  const programFound = await Program.findOne({ name }) as IProgram | null;
  if (programFound) {
    throw new Error("Academic term already exists");
  }
  
  const updatedProgram = await Program.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      createdBy: req.userAuth?._id,
    },
    {
      new: true, // return updated user instead of original one
    }
  ) as IProgram | null;

  res.status(201).json({
    status: "success",
    message: "Class Level updated successfully",
    data: updatedProgram,
  });
});

/**
 * @description Delete Program
 * @route DELETE /api/admins/programs/:id
 * @access Private
 */
export const deleteProgram = AsyncHandler(async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  await Program.findByIdAndDelete(req.params.id);

  res.status(201).json({
    status: "success",
    message: "Program Deleted Successfully",
  });
});
