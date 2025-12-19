import { Request, Response, NextFunction } from 'express';
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
      // Get token from authorization header
      const headerObj = req.headers;
      const token = headerObj?.authorization?.split(' ')[1];

      if (!token) {
        return next(new AuthenticationError('No authorization token provided'));
      }

      // Verify token (async, checks blacklist)
      const verifiedToken = await verifyToken(token);

      let user: UserAuth | null = null;

      // Try to find user in all user types
      user = (await Admin.findById(verifiedToken.id)
        .select('name email role')
        .lean()) as UserAuth | null;

      if (!user) {
        user = (await Teacher.findById(verifiedToken.id)
          .select('name email role')
          .lean()) as UserAuth | null;
      }

      if (!user) {
        user = (await Student.findById(verifiedToken.id)
          .select('name email role')
          .lean()) as UserAuth | null;
      }

      if (!user) {
        return next(new NotFoundError(`User with ID ${verifiedToken.id} not found`));
      }

      // Save user and token info to request object
      req.userAuth = user as any;
      req.token = token;
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed';
      return next(new AuthenticationError(message));
    }
  };
};

export default isAuthenticated;
