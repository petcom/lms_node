/**
 * Response Caching Middleware
 * Adds cache-control headers for client-side and CDN caching
 */

/**
 * Cache public responses (no authentication required)
 * @param {number} maxAge - Cache duration in seconds (default: 5 minutes)
 */
exports.cachePublic = (maxAge = 300) => {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
};

/**
 * Cache private responses (user-specific data)
 * @param {number} maxAge - Cache duration in seconds (default: 1 minute)
 */
exports.cachePrivate = (maxAge = 60) => {
  return (req, res, next) => {
    res.set('Cache-Control', `private, max-age=${maxAge}`);
    next();
  };
};

/**
 * No cache - always fetch fresh data
 */
exports.noCache = () => {
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
  };
};

/**
 * Cache static resources (images, CSS, JS)
 * @param {number} maxAge - Cache duration in seconds (default: 1 year)
 */
exports.cacheStatic = (maxAge = 31536000) => {
  return (req, res, next) => {
    res.set('Cache-Control', `public, max-age=${maxAge}, immutable`);
    next();
  };
};

/**
 * Conditional caching based on request method
 * Only cache GET and HEAD requests
 */
exports.conditionalCache = (maxAge = 300) => {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      res.set('Cache-Control', `public, max-age=${maxAge}`);
    } else {
      res.set('Cache-Control', 'no-store');
    }
    next();
  };
};

/**
 * ETag support for conditional requests
 * Works with Express's built-in etag generation
 */
exports.enableETag = () => {
  return (req, res, next) => {
    res.set('ETag', 'weak'); // Enable weak ETags
    next();
  };
};
