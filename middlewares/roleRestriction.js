const { isValidRole } = require("../utils/roles");
const { AuthenticationError, AuthorizationError } = require("../utils/errors");

/**
 * Role-based access control middleware
 * Restricts route access to users with specific roles
 * @param  {...string} roles - One or more roles that are allowed to access the route
 * @returns {Function} Express middleware function
 * @example
 * // Single role
 * router.get('/admin-only', isAuthenticated(), roleRestriction('admin'), controller);
 * 
 * // Multiple roles
 * router.get('/staff-only', isAuthenticated(), roleRestriction('admin', 'teacher'), controller);
 */
const roleRestriction = (...roles) => {
  // Validate that all provided roles are valid
  const invalidRoles = roles.filter(role => !isValidRole(role));
  if (invalidRoles.length > 0) {
    throw new Error(`Invalid role(s) provided to roleRestriction: ${invalidRoles.join(', ')}`);
  }

  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.userAuth) {
        return next(new AuthenticationError('Authentication required to access this resource'));
      }

      // Check if user has required role
      if (!roles.includes(req.userAuth.role)) {
        return next(new AuthorizationError(
          `Access denied. Required role(s): ${roles.join(', ')}`,
          roles
        ));
      }

      // User has required role, proceed
      next();
    } catch (error) {
      return next(error);
    }
  };
};

module.exports = roleRestriction;