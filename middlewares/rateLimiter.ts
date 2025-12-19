/**
 * Rate Limiting Configuration
 * Protects against brute force and DoS attacks
 */

import rateLimit, { Options } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * General API rate limiter
 * Applies to all API requests
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
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
const authLimiter = rateLimit({
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
const registerLimiter = rateLimit({
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
const passwordResetLimiter = rateLimit({
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
