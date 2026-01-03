import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import verifyToken from '../utils/verifyToken';
import Admin from '../model/Staff/Admin';
import Staff from '../model/Staff/Staff';
import Learner from '../model/Academic/Learner';
import User from '../model/Auth/User';
import { AuthenticationError, NotFoundError } from '../utils/errors';

type UserAuth = {
  _id: any;
  name: string;
  email: string;
  role: string;
  subroles?: string[];
  departmentMemberships?: { departmentId: any; roles?: string[] }[];
};

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

      let profile: { name?: string; email?: string; department?: any } | null = null;

      if (user.role === 'global-admin') {
        profile = await Admin.findById(user._id).select('name email department').lean();
      } else if (user.role === 'staff') {
        profile = await Staff.findById(user._id)
          .select('name email department departmentMemberships')
          .lean();
      } else {
        profile = await Learner.findById(user._id).select('name email department').lean();
      }

      if (!profile) {
        return next(new NotFoundError(`Profile for user ${user._id} not found`));
      }

      // Save user and token info to request object
      req.userAuth = {
        _id: user._id,
        name: profile.name || '',
        email: user.email,
        role: user.role,
        subroles: user.subroles || undefined,
        departmentMemberships:
          user.role === 'staff'
            ? (profile as any).departmentMemberships || undefined
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
