const verifyToken = require("../utils/verifyToken");

const isAuthenticated = (model) => {
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

      // Verify token (now async, checks blacklist)
      const verifiedToken = await verifyToken(token);

      // Find the user
      const user = await model
        .findById(verifiedToken.id)
        .select("name email role");

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