/**
 * Response Caching Middleware
 * Adds cache-control headers for client-side and CDN caching
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Cache public responses (no authentication required)
 * @param maxAge - Cache duration in seconds (default: 5 minutes)
 */
export const cachePublic = (maxAge: number = 300) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
};

/**
 * Cache private responses (user-specific data)
 * @param maxAge - Cache duration in seconds (default: 1 minute)
 */
export const cachePrivate = (maxAge: number = 60) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Cache-Control', `private, max-age=${maxAge}`);
    next();
  };
};

/**
 * No cache - always fetch fresh data
 */
export const noCache = () => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
  };
};

/**
 * Cache static resources (images, CSS, JS)
 * @param maxAge - Cache duration in seconds (default: 1 year)
 */
export const cacheStatic = (maxAge: number = 31536000) => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Cache-Control', `public, max-age=${maxAge}, immutable`);
    next();
  };
};

/**
 * Conditional caching based on request method
 * Only cache GET and HEAD requests
 */
export const conditionalCache = (maxAge: number = 300) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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
export const enableETag = () => {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set('ETag', 'weak'); // Enable weak ETags
    next();
  };
};
