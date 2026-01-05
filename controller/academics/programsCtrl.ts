import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Admin from '../../model/Staff/Admin';
import Program from '../../model/Academic/Program';
import ProgramLevel from '../../model/Academic/ProgramLevel';
import { IProgram, IAdmin } from '../../types/models-types';
import { AuthorizationError } from '../../utils/errors';

const MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

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
export const createProgram = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, CreateProgramBody>,
    res: Response
  ): Promise<void> => {
    const { name, description } = req.body;

    // check if the program exists
    const programFound = (await Program.findOne({ name }).lean()) as IProgram | null;
    if (programFound) {
      throw new Error('Program  already exists');
    }

    // create
    const programCreated = (await Program.create({
      name,
      description,
      createdBy: req.userAuth?._id,
      department:
        (req.userAuth as any)?.department || new mongoose.Types.ObjectId(MASTER_DEPARTMENT_ID),
    })) as IProgram;

    const admin = (await Admin.findById(req.userAuth?._id)) as IAdmin | null;
    if (admin) {
      // push program object into logged in Admin
      admin.programs?.push(programCreated._id); // push the created program ID to the admin instance upon creation.
      await admin.save();
    }

    res.status(201).json({
      status: 'success',
      message: 'Program Created Successfully',
      data: programCreated,
    });
  }
);

/**
 * @description Get All Programs
 * @route GET /api/admins/programs
 * @access Private
 */
export const getPrograms = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const results = res.results as any;
  const items = Array.isArray(results?.data) ? results.data : [];

  if (items.length > 0) {
    const programIds = items.map((program: any) => program._id);
    const levels = await ProgramLevel.find({ program: { $in: programIds } })
      .select('program courses')
      .lean();
    const coursesByProgram = new Map<string, Set<string>>();
    levels.forEach((level) => {
      const programId = level.program?.toString();
      if (!programId) return;
      const set = coursesByProgram.get(programId) || new Set<string>();
      (level.courses || []).forEach((courseId: any) => set.add(courseId.toString()));
      coursesByProgram.set(programId, set);
    });

    results.data = items.map((program: any) => {
      const courseSet = coursesByProgram.get(program._id.toString());
      return {
        ...program,
        courses: courseSet ? Array.from(courseSet) : [],
      };
    });
  }

  res.status(200).json(results);
});

/**
 * @description Get Single Program
 * @route GET /api/admins/programs/:id
 * @access Private
 */
export const getSingleProgram = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const singleProgram = (await Program.findById(req.params.id)) as IProgram | null;

    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = singleProgram?.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this program');
      }
    }

    const levels = await ProgramLevel.find({ program: singleProgram._id })
      .select('courses')
      .lean();
    const courseSet = new Set<string>();
    levels.forEach((level) => {
      (level.courses || []).forEach((courseId: any) => courseSet.add(courseId.toString()));
    });

    const payload = {
      ...singleProgram?.toObject?.(),
      courses: Array.from(courseSet),
    };

    res.status(201).json({
      status: 'success',
      message: 'Single Program fetched successfully',
      data: payload,
    });
  }
);

/**
 * @description Update Program
 * @route PUT /api/admins/programs/:id
 * @access Private
 */
export const updateProgram = AsyncHandler(
  async (req: Request<{ id: string }, any, UpdateProgramBody>, res: Response): Promise<void> => {
    const { name, description } = req.body;

    const programFound = (await Program.findOne({ name })) as IProgram | null;
    if (programFound) {
      throw new Error('Academic term already exists');
    }

    const existing = await Program.findById(req.params.id);
    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = existing?.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this program');
      }
    }

    const updatedProgram = (await Program.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        createdBy: req.userAuth?._id,
      },
      {
        new: true, // return updated user instead of original one
      }
    )) as IProgram | null;

    res.status(201).json({
      status: 'success',
      message: 'Class Level updated successfully',
      data: updatedProgram,
    });
  }
);

/**
 * @description Delete Program
 * @route DELETE /api/admins/programs/:id
 * @access Private
 */
export const deleteProgram = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const existing = await Program.findById(req.params.id);
    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = existing?.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this program');
      }
    }

    await Program.findByIdAndDelete(req.params.id);

    res.status(201).json({
      status: 'success',
      message: 'Program Deleted Successfully',
    });
  }
);

/**
 * @description Archive Program
 * @route PATCH /api/admins/programs/:id/archive
 * @access Private
 */
export const archiveProgram = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const program = (await Program.findById(req.params.id)) as IProgram | null;
    if (!program) {
      throw new Error('Program not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = program.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this program');
      }
    }

    if (!program.archived) {
      program.archived = true;
      program.archivedAt = new Date();
      await program.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Program archived successfully',
      data: program,
    });
  }
);

/**
 * @description Unarchive Program
 * @route PATCH /api/admins/programs/:id/unarchive
 * @access Private
 */
export const unarchiveProgram = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const program = (await Program.findById(req.params.id)) as IProgram | null;
    if (!program) {
      throw new Error('Program not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = program.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this program');
      }
    }

    if (program.archived) {
      program.archived = false;
      program.archivedAt = undefined;
      await program.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Program unarchived successfully',
      data: program,
    });
  }
);
