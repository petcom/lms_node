import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import StaffRole from '../../model/Staff/StaffRole';

export const getStaffRoles = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const roles = await StaffRole.find().sort({ name: 1 }).lean();

  res.status(200).json({
    status: 'success',
    data: roles,
  });
});
