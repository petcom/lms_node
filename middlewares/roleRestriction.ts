import { Request, Response, NextFunction } from 'express';
import { isValidRole } from '../utils/roles';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { UserRole } from '../types/auth';

/**
 * Role-based access control middleware
 * Restricts route access to users with specific roles
 * @param roles - One or more roles that are allowed to access the route
 * @returns Express middleware function
 * @example
 * // Single role
 * router.get('/admin-only', isAuthenticated(), roleRestriction('admin'), controller);
 * 
 * // Multiple roles
 * router.get('/staff-only', isAuthenticated(), roleRestriction('admin', 'teacher'), controller);
 */
const roleRestriction = (...roles: UserRole[]) => {
  // Validate that all provided roles are valid
  const invalidRoles = roles.filter((role) => !isValidRole(role));
  if (invalidRoles.length > 0) {
    throw new Error(
      `Invalid role(s) provided to roleRestriction: ${invalidRoles.join(', ')}`
    );
  }

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.userAuth) {
        return next(
          new AuthenticationError('Authentication required to access this resource')
        );
      }

      // Check if user has required role
      if (!roles.includes(req.userAuth.role as UserRole)) {
        return next(
          new AuthorizationError(
            `Access denied. Required role(s): ${roles.join(', ')}`
          )
        );
      }

      // User has required role, proceed
      next();
    } catch (error) {
      return next(error);
    }
  };
};

export default roleRestriction;
