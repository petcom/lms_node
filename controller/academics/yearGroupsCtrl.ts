import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import Admin from '../../model/Staff/Admin';
import YearGroup from '../../model/Academic/YearGroup';
import { IYearGroup, IAdmin } from '../../types/models';
import { Types } from 'mongoose';

// Request body interfaces
interface CreateYearGroupBody {
  name: string;
  academicYear: Types.ObjectId;
}

interface UpdateYearGroupBody {
  name?: string;
  academicYear?: Types.ObjectId;
}

/**
 * @description Create Year Group
 * @route POST /api/admins/year-groups
 * @access Private
 */
export const createYearGroup = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, CreateYearGroupBody>,
    res: Response
  ): Promise<void> => {
    const { name, academicYear } = req.body;

    // Check if exists
    const yearGroup = (await YearGroup.findOne({ name })) as IYearGroup | null;
    if (yearGroup) {
      throw new Error('Year Group/Graduation Year already exists');
    }

    // create year group obj
    const subjectYearGroup = (await YearGroup.create({
      name,
      academicYear,
      createdBy: req.userAuth?._id,
    })) as IYearGroup;

    // find the admin
    const admin = (await Admin.findById(req.userAuth?._id)) as IAdmin | null;
    if (!admin) {
      throw new Error('Admin not found');
    }

    // push year group into admin
    admin.yearGroups?.push(subjectYearGroup._id);
    // save
    await admin.save();

    // return response
    res.status(201).json({
      status: 'success',
      message: 'Year Group Created Successfully',
      data: subjectYearGroup,
    });
  }
);

/**
 * @description Get All Year Groups
 * @route GET /api/admins/year-groups
 * @access Private
 */
export const getYearGroups = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

/**
 * @description Get Single Year Group
 * @route GET /api/admins/year-groups/:id
 * @access Private
 */
export const getYearGroup = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const singleYearGroup = (await YearGroup.findById(req.params.id)) as IYearGroup | null;

    res.status(201).json({
      status: 'success',
      message: 'Single Year Group fetched successfully',
      data: singleYearGroup,
    });
  }
);

/**
 * @description Update Year Group
 * @route PUT /api/admins/year-groups/:id
 * @access Private
 */
export const updateYearGroup = AsyncHandler(
  async (req: Request<{ id: string }, any, UpdateYearGroupBody>, res: Response): Promise<void> => {
    const { name, academicYear } = req.body;

    const yearGroupFound = (await YearGroup.findOne({ name })) as IYearGroup | null;
    if (yearGroupFound) {
      throw new Error('Year Group already exists');
    }

    const yearGroup = (await YearGroup.findByIdAndUpdate(
      req.params.id,
      {
        name,
        academicYear,
        createdBy: req.userAuth?._id,
      },
      {
        new: true, // return updated user instead of original one
      }
    )) as IYearGroup | null;

    res.status(201).json({
      status: 'success',
      message: 'Year Group updated successfully',
      data: yearGroup,
    });
  }
);

/**
 * @description Delete Year Group
 * @route DELETE /api/admins/year-groups/:id
 * @access Private
 */
export const deleteYearGroup = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await YearGroup.findByIdAndDelete(req.params.id);

    res.status(201).json({
      status: 'success',
      message: 'Year Group Deleted Successfully',
    });
  }
);
