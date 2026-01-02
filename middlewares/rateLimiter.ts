/**
 * Rate Limiting Configuration
 * Protects against brute force and DoS attacks
 */

import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response, RequestHandler } from 'express';

const rateLimitEnv = process.env.RATE_LIMIT_ENABLED?.toLowerCase();
const rateLimitEnabled =
  rateLimitEnv === undefined
    ? !(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')
    : !['false', '0', 'no', 'off'].includes(rateLimitEnv);
const isRateLimitDisabled = !rateLimitEnabled;
const passthrough: RequestHandler = (_req, _res, next) => next();

/**
 * General API rate limiter
 * Applies to all API requests
 */
const SCORM_RATE_LIMIT_EXEMPT_PREFIXES = [
  '/api/v1/content/scorm/runtime',
  '/api/v1/content/scorm/player',
  '/api/v1/content/scorm/content',
];

const apiLimiter = isRateLimitDisabled
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
      // SCORM runtime/player/content endpoints emit frequent polls; skip rate limiting there.
      skip: (req: Request) => {
        const url = req.originalUrl || req.url || '';
        return SCORM_RATE_LIMIT_EXEMPT_PREFIXES.some((prefix) => url.startsWith(prefix));
      },
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          status: 'error',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((req.rateLimit?.resetTime ?? Date.now()) / 1000),
        });
      },
    } as Partial<Options>);

/**
 * Auth rate limiter (stricter)
 * Applies to login and registration endpoints
 */
const authLimiter = isRateLimitDisabled
  ? passthrough
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per windowMs
      message: 'Too many login attempts, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false, // Count successful requests
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          status: 'error',
          message: 'Too many authentication attempts. Please try again later.',
          retryAfter: Math.ceil((req.rateLimit?.resetTime ?? Date.now()) / 1000),
        });
      },
    } as Partial<Options>);

/**
 * Registration rate limiter (very strict)
 * Prevents spam account creation
 */
const registerLimiter = isRateLimitDisabled
  ? passthrough
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Limit each IP to 3 registration attempts per hour
      message: 'Too many accounts created, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          status: 'error',
          message: 'Too many registration attempts. Please try again in an hour.',
          retryAfter: Math.ceil((req.rateLimit?.resetTime ?? Date.now()) / 1000),
        });
      },
    } as Partial<Options>);

/**
 * Password reset rate limiter
 * Prevents password reset spam
 */
const passwordResetLimiter = isRateLimitDisabled
  ? passthrough
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // Limit each IP to 3 password reset requests per hour
      message: 'Too many password reset requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          status: 'error',
          message: 'Too many password reset attempts. Please try again in an hour.',
          retryAfter: Math.ceil((req.rateLimit?.resetTime ?? Date.now()) / 1000),
        });
      },
    } as Partial<Options>);

export { apiLimiter, authLimiter, registerLimiter, passwordResetLimiter };
