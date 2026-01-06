import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import verifyToken from '../utils/verifyToken';
import Admin from '../model/Staff/Admin';
import Staff from '../model/Staff/Staff';
import Learner from '../model/Academic/Learner';
import User from '../model/Auth/User';
import { AuthenticationError, NotFoundError } from '../utils/errors';

// Profile type from lean() query results
type LeanProfile = {
  name?: { firstName?: string; lastName?: string; middleName?: string };
  department?: any;
  departmentMemberships?: { departmentId: any; roles?: string[] }[];
} | null;

/**
 * Unified authentication middleware
 * Authenticates users from any user type (Admin, Instructor, Learner)
 * @param options - Optional configuration
 * @returns Express middleware function
 */
const isAuthenticated = () => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const isTestEnv = process.env.NODE_ENV === 'test';
      const shouldBypassAuth = isTestEnv && process.env.BYPASS_AUTH_FOR_TESTS !== 'false';
      const bypassDepartmentId = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

      const tokenHeader = req.headers?.authorization || '';
      const token = tokenHeader.startsWith('Bearer') ? tokenHeader.split(' ')[1] : tokenHeader;

      if (shouldBypassAuth && token) {
        const roleMap: Record<string, { role: string; id: string; department?: string }> = {
          'test-global-admin-token': {
            role: 'global-admin',
            id: '0000000000000000000000a1',
            department: bypassDepartmentId,
          },
          'test-instructor-token': {
            role: 'staff',
            id: '0000000000000000000000b1',
            department: bypassDepartmentId,
          },
          'test-learner-token': {
            role: 'learner',
            id: '0000000000000000000000c1',
            department: bypassDepartmentId,
          },
          // Department-scoped global admin tokens for integration tests
          'test-top-global-admin-token': {
            role: 'global-admin',
            id: '0000000000000000000000a2',
            department: '0000000000000000000000d1',
          },
          'test-sub-global-admin-token': {
            role: 'global-admin',
            id: '0000000000000000000000a3',
            department: '0000000000000000000000d2',
          },
        };

        if (token in roleMap) {
          const { role, id } = roleMap[token];

          req.userAuth = {
            _id: new mongoose.Types.ObjectId(id),
            name: `${role} test user`,
            email: `${role}@example.com`,
            role,
            department: new mongoose.Types.ObjectId(
              roleMap[token].department || bypassDepartmentId
            ),
          } as any;
          req.token = token;
          return next();
        }
      }

      let tokenValue = token;

      if (!tokenValue && req.headers.cookie) {
        const cookiePairs = req.headers.cookie.split(';').map((c) => c.trim().split('='));
        const cookieMap = Object.fromEntries(
          cookiePairs.map(([k, ...v]) => [k, decodeURIComponent(v.join('='))])
        );
        const cookieToken = cookieMap.token;
        if (cookieToken) {
          tokenValue = cookieToken.startsWith('Bearer') ? cookieToken.split(' ')[1] : cookieToken;
        }
      }

      if (!tokenValue) {
        return next(new AuthenticationError('No authorization token provided'));
      }

      // Verify token (async, checks blacklist)
      const verifiedToken = await verifyToken(tokenValue);

      const user = await User.findById(verifiedToken.id).lean();

      if (!user) {
        return next(new NotFoundError(`User with ID ${verifiedToken.id} not found`));
      }

      let profile: LeanProfile = null;

      // DCV-001: Use primaryRole (or first role) to determine profile lookup
      const primaryRole = user.primaryRole || (user.roles && user.roles[0]) || 'learner';

      if (primaryRole === 'global-admin') {
        profile = await Admin.findById(user._id).select('name department').lean() as unknown as LeanProfile;
      } else if (primaryRole === 'staff') {
        profile = await Staff.findById(user._id)
          .select('name department departmentMemberships')
          .lean() as unknown as LeanProfile;
      } else {
        profile = await Learner.findById(user._id).select('name department').lean() as unknown as LeanProfile;
      }

      if (!profile) {
        return next(new NotFoundError(`Profile for user ${user._id} not found`));
      }

      // Format name from IPersonName
      const formatName = (name?: { firstName?: string; lastName?: string; middleName?: string }): string => {
        if (!name) return '';
        return [name.firstName, name.middleName, name.lastName].filter(Boolean).join(' ');
      };

      // Save user and token info to request object
      // DCV-001: Support both legacy 'role' and new 'roles' array
      req.userAuth = {
        _id: user._id,
        name: formatName(profile.name),
        email: user.email,
        role: primaryRole,                          // Legacy: for backward compatibility
        roles: user.roles || [primaryRole],         // New: all roles
        primaryRole: primaryRole,                   // New: explicit primary
        staffRoles: user.staffRoles || undefined,   // Renamed from subroles
        departmentMemberships:
          primaryRole === 'staff'
            ? profile.departmentMemberships || undefined
            : undefined,
        department: profile.department,
      } as any;
      req.token = tokenValue;
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return next(new AuthenticationError(message));
    }
  };
};

export default isAuthenticated;
