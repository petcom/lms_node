import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Admin from '../../model/Staff/Admin';
import ClassLevel from '../../model/Academic/ClassLevel';
import { IClassLevel, IAdmin } from '../../types/models';
import { AuthorizationError } from '../../utils/errors';

const MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

// Request body interfaces
interface CreateClassLevelBody {
  name: string;
  description?: string;
}

interface UpdateClassLevelBody {
  name?: string;
  description?: string;
}

/**
 * @description Create Class Level
 * @route POST /api/admins/class-levels
 * @access Private
 */
export const createClassLevel = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, CreateClassLevelBody>,
    res: Response
  ): Promise<void> => {
    const { name, description } = req.body;

    // check if the class level exists
    const classFound = (await ClassLevel.findOne({ name })) as IClassLevel | null;
    if (classFound) {
      throw new Error('Academic term already exists');
    }

    // create
    const classLevelCreated = (await ClassLevel.create({
      name,
      description,
      createdBy: req.userAuth?._id,
      department:
        (req.userAuth as any)?.department || new mongoose.Types.ObjectId(MASTER_DEPARTMENT_ID),
    })) as IClassLevel;

    // push class into Admin
    const admin = (await Admin.findById(req.userAuth?._id)) as IAdmin | null;
    if (admin) {
      admin.classLevels?.push(classLevelCreated._id); // push the created term ID to the admin instance upon creation.
      await admin.save();
    }

    res.status(201).json({
      status: 'success',
      message: 'Class Level Created',
      data: classLevelCreated,
    });
  }
);

/**
 * @description Get All Class Levels
 * @route GET /api/admins/class-levels
 * @access Private
 */
export const getClassLevels = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

/**
 * @description Get Single Class Level
 * @route GET /api/admins/class-levels/:id
 * @access Private
 */
export const getClassLevel = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const oneClassLevel = (await ClassLevel.findById(req.params.id)) as IClassLevel | null;

    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = (oneClassLevel as any)?.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this class level');
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Class Level fetched successfully',
      data: oneClassLevel,
    });
  }
);

/**
 * @description Update Single Class Level
 * @route PUT /api/admins/class-levels/:id
 * @access Private
 */
export const updateClassLevel = AsyncHandler(
  async (req: Request<{ id: string }, any, UpdateClassLevelBody>, res: Response): Promise<void> => {
    const { name, description } = req.body;

    const classLevelFound = (await ClassLevel.findOne({ name })) as IClassLevel | null;
    if (classLevelFound) {
      throw new Error('Academic term already exists');
    }

    const existing = await ClassLevel.findById(req.params.id);
    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = (existing as any)?.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this class level');
      }
    }

    const updatedClassLevel = (await ClassLevel.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        createdBy: req.userAuth?._id,
      },
      {
        new: true, // return updated user instead of original one
      }
    )) as IClassLevel | null;

    res.status(201).json({
      status: 'success',
      message: 'Class Level updated successfully',
      data: updatedClassLevel,
    });
  }
);

/**
 * @description Delete Class Level
 * @route DELETE /api/admins/class-levels/:id
 * @access Private
 */
export const deleteClassLevel = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const existing = await ClassLevel.findById(req.params.id);
    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = (existing as any)?.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this class level');
      }
    }

    await ClassLevel.findByIdAndDelete(req.params.id);

    res.status(201).json({
      status: 'success',
      message: 'Class Level Deleted Successfully',
    });
  }
);

/**
 * @description Archive Class Level
 * @route PATCH /api/admins/class-levels/:id/archive
 * @access Private
 */
export const archiveClassLevel = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const classLevel = (await ClassLevel.findById(req.params.id)) as IClassLevel | null;
    if (!classLevel) {
      throw new Error('Class Level not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = (classLevel as any)?.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this class level');
      }
    }

    if (!classLevel.archived) {
      classLevel.archived = true;
      classLevel.archivedAt = new Date();
      await classLevel.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Class Level archived successfully',
      data: classLevel,
    });
  }
);

/**
 * @description Unarchive Class Level
 * @route PATCH /api/admins/class-levels/:id/unarchive
 * @access Private
 */
export const unarchiveClassLevel = AsyncHandler(
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const classLevel = (await ClassLevel.findById(req.params.id)) as IClassLevel | null;
    if (!classLevel) {
      throw new Error('Class Level not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (scope && scope !== 'all') {
      const dept = (classLevel as any)?.department?.toString();
      if (!dept || !scope.includes(dept)) {
        throw new AuthorizationError('Access denied for this class level');
      }
    }

    if (classLevel.archived) {
      classLevel.archived = false;
      classLevel.archivedAt = undefined;
      await classLevel.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Class Level unarchived successfully',
      data: classLevel,
    });
  }
);
