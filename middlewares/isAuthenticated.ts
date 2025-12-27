import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import verifyToken from '../utils/verifyToken';
import Admin from '../model/Staff/Admin';
import Teacher from '../model/Staff/Teacher';
import Student from '../model/Academic/Student';
import { AuthenticationError, NotFoundError } from '../utils/errors';

type UserAuth = {
  _id: any;
  name: string;
  email: string;
  role: string;
};

/**
 * Unified authentication middleware
 * Authenticates users from any user type (Admin, Teacher, Student)
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
        const roleMap: Record<string, { role: string; id: string }> = {
          'test-admin-token': { role: 'admin', id: '0000000000000000000000a1' },
          'test-teacher-token': { role: 'teacher', id: '0000000000000000000000b1' },
          'test-student-token': { role: 'student', id: '0000000000000000000000c1' },
        };

        if (token in roleMap) {
          const { role, id } = roleMap[token];

          req.userAuth = {
            _id: new mongoose.Types.ObjectId(id),
            name: `${role} test user`,
            email: `${role}@example.com`,
            role,
            department: new mongoose.Types.ObjectId(bypassDepartmentId),
          } as any;
          req.token = token;
          return next();
        }
      }

      let tokenValue = token;

      if (!tokenValue && req.headers.cookie) {
        const cookiePairs = req.headers.cookie.split(';').map((c) => c.trim().split('='));
        const cookieMap = Object.fromEntries(cookiePairs.map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
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

      let user: UserAuth | null = null;

      // Try to find user in all user types
      user = (await Admin.findById(verifiedToken.id)
        .select('name email role department')
        .lean()) as UserAuth | null;

      if (!user) {
        user = (await Teacher.findById(verifiedToken.id)
          .select('name email role department')
          .lean()) as UserAuth | null;
      }

      if (!user) {
        user = (await Student.findById(verifiedToken.id)
          .select('name email role department')
          .lean()) as UserAuth | null;
      }

      if (!user) {
        return next(new NotFoundError(`User with ID ${verifiedToken.id} not found`));
      }

      // Save user and token info to request object
      req.userAuth = user as any;
      req.token = tokenValue;
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return next(new AuthenticationError(message));
    }
  };
};

export default isAuthenticated;
