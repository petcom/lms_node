const { isValidRole } = require("../utils/roles");

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
    throw new Error(`Invalid role(s) provided: ${invalidRoles.join(', ')}`);
  }

  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.userAuth) {
        return res.status(401).json({
          status: 'failed',
          message: 'Authentication required. Please log in to access this resource.'
        });
      }

      // Check if user has required role
      if (!roles.includes(req.userAuth.role)) {
        return res.status(403).json({
          status: 'failed',
          message: 'Access denied. You do not have permission to perform this action.',
          requiredRoles: roles,
          userRole: req.userAuth.role
        });
      }

      // User has required role, proceed
      next();
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Error checking user permissions',
        error: error.message
      });
    }
  };
};

module.exports = roleRestriction;