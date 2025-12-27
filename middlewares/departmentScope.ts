import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Department from '../model/Academic/Department';
import { AuthorizationError } from '../utils/errors';

const MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

export const departmentScope = () => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.userAuth) {
        return next(new AuthorizationError('Authentication required')); // should be caught earlier
      }

      const requesterDeptId = (req.userAuth as any)?.department
        ? new mongoose.Types.ObjectId((req.userAuth as any).department as any)
        : null;

      const master = await Department.findOne({ level: 'master' }).lean();
      const masterId = master?._id?.toString() || MASTER_DEPARTMENT_ID;

      // If no department set, fall back to master (default-open model)
      const departmentIdToUse =
        requesterDeptId || master?._id || new mongoose.Types.ObjectId(masterId);
      const department = await Department.findById(departmentIdToUse).lean();

      if (!department) {
        req.departmentScope = { userDepartmentId: undefined, accessibleDepartmentIds: 'all' };
        return next();
      }

      const userDepartmentId = department._id.toString();

      if (department.level === 'master') {
        req.departmentScope = { userDepartmentId, accessibleDepartmentIds: 'all' };
        return next();
      }

      if (department.level === 'top') {
        const children = await Department.find({ parent: department._id }).select('_id').lean();
        const childIds = children.map((c) => c._id.toString());
        req.departmentScope = {
          userDepartmentId,
          accessibleDepartmentIds: [userDepartmentId, ...childIds],
        };
        return next();
      }

      // sub-level: only own department
      req.departmentScope = {
        userDepartmentId,
        accessibleDepartmentIds: [userDepartmentId],
      };
      return next();
    } catch (err) {
      return next(err);
    }
  };
};

export default departmentScope;
