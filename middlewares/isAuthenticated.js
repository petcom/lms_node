const verifyToken = require("../utils/verifyToken");
const Admin = require("../model/Staff/Admin");
const Teacher = require("../model/Staff/Teacher");
const Student = require("../model/Academic/Student");

/**
 * Unified authentication middleware
 * Authenticates users from any user type (Admin, Teacher, Student)
 * @param {Object} options - Optional configuration
 * @param {Model} options.model - Specific model to use (if provided, only checks that model)
 * @returns {Function} Express middleware function
 */
const isAuthenticated = (options = {}) => {
  return async (req, res, next) => {
    try {
      // Get token from authorization header
      const headerObj = req.headers;
      const token = headerObj?.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          status: 'failed',
          message: 'No authorization token provided'
        });
      }

      // Verify token (async, checks blacklist)
      const verifiedToken = await verifyToken(token);

      let user = null;

      // If specific model provided, only check that model
      if (options.model) {
        user = await options.model
          .findById(verifiedToken.id)
          .select("name email role");
      } else {
        // Try to find user in all user types
        user = await Admin.findById(verifiedToken.id).select("name email role");
        
        if (!user) {
          user = await Teacher.findById(verifiedToken.id).select("name email role");
        }
        
        if (!user) {
          user = await Student.findById(verifiedToken.id).select("name email role");
        }
      }

      if (!user) {
        return res.status(401).json({
          status: 'failed',
          message: 'User not found or has been deleted'
        });
      }

      // Save user and token info to request object
      req.userAuth = user;
      req.token = token;
      next();
    } catch (error) {
      return res.status(401).json({
        status: 'failed',
        message: error.message || 'Authentication failed'
      });
    }
  };
};

module.exports = isAuthenticated;