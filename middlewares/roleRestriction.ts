import { Request, Response, NextFunction } from 'express';
import { isValidRole } from '../utils/roles';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { UserRole } from '../types/auth-types';

/**
 * Role-based access control middleware
 * Restricts route access to users with specific roles
 * 
 * DCV-008: Updated to support User.roles array
 * - Checks if ANY of the user's roles match the required roles
 * - Maintains backward compatibility with legacy req.userAuth.role
 * 
 * @param allowedRoles - One or more roles that are allowed to access the route
 * @returns Express middleware function
 * @example
 * // Single role
 * router.get('/global-admin-only', isAuthenticated(), roleRestriction('global-admin'), controller);
 *
 * // Multiple roles
 * router.get('/staff-only', isAuthenticated(), roleRestriction('global-admin', 'staff'), controller);
 */
const roleRestriction = (...allowedRoles: UserRole[]) => {
  // Validate that all provided roles are valid
  const invalidRoles = allowedRoles.filter((role) => !isValidRole(role));
  if (invalidRoles.length > 0) {
    throw new Error(`Invalid role(s) provided to roleRestriction: ${invalidRoles.join(', ')}`);
  }

  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Check if user is authenticated
      if (!req.userAuth) {
        return next(new AuthenticationError('Authentication required to access this resource'));
      }

      // DCV-008: Check roles array if available, fall back to legacy role field
      const userRoles = req.userAuth.roles || [req.userAuth.role];
      
      // Check if user has any of the allowed roles
      const hasAllowedRole = userRoles.some((userRole: string) => 
        allowedRoles.includes(userRole as UserRole)
      );

      if (!hasAllowedRole) {
        return next(new AuthorizationError(`Access denied. Required role(s): ${allowedRoles.join(', ')}`));
      }

      // User has required role, proceed
      next();
    } catch (error) {
      return next(error);
    }
  };
};

/**
 * Shorthand middleware for Instructor or Global Admin access
 */
export const isInstructorOrAdmin = roleRestriction('staff', 'global-admin');

/**
 * Shorthand middleware for Global Admin only access
 */
export const isAdmin = roleRestriction('global-admin');

/**
 * Shorthand middleware for Learner access
 */
export const isLearner = roleRestriction('learner');

/**
 * DCV-008: Check if user has a specific staffRole (sub-permission)
 * @param requiredStaffRole - The staff role to check for
 */
export const requireStaffRole = (requiredStaffRole: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userAuth) {
      return next(new AuthenticationError('Authentication required'));
    }

    // Global admins bypass staff role checks
    const userRoles = req.userAuth.roles || [req.userAuth.role];
    if (userRoles.includes('global-admin')) {
      return next();
    }

    // Check staffRoles array
    const staffRoles = req.userAuth.staffRoles || [];
    if (!staffRoles.includes(requiredStaffRole)) {
      return next(new AuthorizationError(`Access denied. Required staff role: ${requiredStaffRole}`));
    }

    next();
  };
};

export default roleRestriction;
