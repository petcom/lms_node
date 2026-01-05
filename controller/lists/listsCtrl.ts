import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import StaffRole from '../../model/Staff/StaffRole';
import Lookup from '../../model/System/Lookup';

export const getStaffRoles = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const roles = await StaffRole.find().sort({ name: 1 }).lean();

  res.status(200).json({
    status: 'success',
    data: roles,
  });
});

export const getCourseStatuses = AsyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const lookups = await Lookup.find({ type: 'CourseStatus' }).sort({ value: 1 }).lean();
    const data =
      lookups.length > 0
        ? lookups.map((entry) => ({ value: entry.value, label: entry.value }))
        : [
            { value: 'draft', label: 'Draft' },
            { value: 'rendered', label: 'Rendered' },
            { value: 'published', label: 'Published' },
          ];

    res.status(200).json({
      status: 'success',
      data,
    });
  }
);
