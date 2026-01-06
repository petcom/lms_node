/**
 * Deprecation Middleware
 * 
 * Adds standard HTTP deprecation headers to warn API consumers
 * that an endpoint is deprecated and will be removed.
 * 
 * Follows:
 * - RFC 8594: The "Deprecation" HTTP Header Field
 * - RFC 8288: Web Linking (for Link header)
 * 
 * EVIP Phase 4 implementation
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Creates a middleware that adds deprecation headers to responses.
 * 
 * @param alternative - The alternative endpoint to use (e.g., '/api/v1/programs')
 * @param removalDate - The date when the endpoint will be removed (ISO format: 'YYYY-MM-DD')
 * 
 * @example
 * // In route definition:
 * router.post(
 *   '/programs',
 *   deprecatedEndpoint('/api/v1/programs', '2026-06-01'),
 *   isAuthenticated,
 *   createProgram
 * );
 */
export const deprecatedEndpoint = (
  alternative: string,
  removalDate: string
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // RFC 8594: Deprecation header format: date="<date>"
    res.setHeader('Deprecation', `date="${removalDate}"`);
    
    // Sunset header indicating when the endpoint will be removed
    res.setHeader('Sunset', removalDate);
    
    // RFC 8288: Link header pointing to the successor version
    res.setHeader('Link', `<${alternative}>; rel="successor-version"`);
    
    // Log warning for monitoring/alerting
    console.warn(
      `Deprecated endpoint called: ${req.method} ${req.path} -> Use ${alternative}`
    );
    
    next();
  };
};

export default deprecatedEndpoint;
