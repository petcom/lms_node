import { Request, Response } from 'express';
import { ROLE_PERMISSIONS, ROLES } from '../utils/roles';

export const getPermissionsMatrix = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: {
      roles: ROLES,
      permissions: ROLE_PERMISSIONS,
    },
  });
};
