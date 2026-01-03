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
      const membershipIds = Array.isArray((req.userAuth as any)?.departmentMemberships)
        ? (req.userAuth as any).departmentMemberships
            .map((membership: { departmentId?: any }) => membership.departmentId)
            .filter((id: any) => mongoose.isValidObjectId(id))
            .map((id: any) => new mongoose.Types.ObjectId(id))
        : [];

      const master = await Department.findOne({ level: 'master' }).lean();
      const masterId = master?._id?.toString() || MASTER_DEPARTMENT_ID;

      if ((req.userAuth as any)?.role === 'staff' && membershipIds.length > 0) {
        const departments = await Department.find({ _id: { $in: membershipIds } }).lean();
        const topLevelIds: mongoose.Types.ObjectId[] = [];
        const accessible = new Set<string>();
        let userDepartmentId: string | undefined;

        for (const department of departments) {
          if (!userDepartmentId) {
            userDepartmentId = department._id.toString();
          }
          if (department.level === 'master') {
            req.departmentScope = { userDepartmentId, accessibleDepartmentIds: 'all' };
            return next();
          }
          if (department.level === 'top') {
            topLevelIds.push(department._id);
            accessible.add(department._id.toString());
          } else {
            accessible.add(department._id.toString());
          }
        }

        if (topLevelIds.length > 0) {
          const children = await Department.find({ parent: { $in: topLevelIds } })
            .select('_id')
            .lean();
          children.forEach((child) => accessible.add(child._id.toString()));
        }

        req.departmentScope = {
          userDepartmentId,
          accessibleDepartmentIds: Array.from(accessible),
        };
        return next();
      }

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
