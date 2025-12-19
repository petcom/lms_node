import express, { Application } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import corsMiddleware from '../config/cors';
import swaggerSpecs from '../config/swagger';
import { apiLimiter } from '../middlewares/rateLimiter';
import { cachePublic } from '../middlewares/caching';
import { globalErrHandler, notFoundErr } from '../middlewares/globalErrHandler';
import logger from '../utils/logger';

import authRouter from '../routes/auth/authRoutes';
import passwordRouter from '../routes/auth/passwordRoutes';
import adminRouter from '../routes/staff/adminRouter';
import academicYearRouter from '../routes/academics/academicYear';
import academicTermRouter from '../routes/academics/academicTerm';
import classLevelRouter from '../routes/academics/classLevel';
import programRouter from '../routes/academics/program';
import subjectRouter from '../routes/academics/subject';
import yearGroupRouter from '../routes/academics/yearGroup';
import teachersRouter from '../routes/staff/teacherRouter';
import examRouter from '../routes/academics/examRoutes';
import studentRouter from '../routes/students/studentRouter';
import questionsRouter from '../routes/academics/questionRoutes';
import examResultRouter from '../routes/academics/examResultsRoutes';
import { healthCheck, readyCheck } from '../controller/healthCtrl';

const app: Application = express(); // create application instance of express

/**
 * Health Check Routes (before other middleware for reliability)
 */
app.get('/health', cachePublic(60), healthCheck);
app.get('/ready', cachePublic(60), readyCheck);

/**
 * API Documentation (Swagger)
 */
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customSiteTitle: 'LMS API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  })
);

/**
 * Performance Optimization
 */
// Gzip compression for responses
app.use(
  compression({
    level: 6, // Compression level (0-9, 6 is default)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

/**
 * Logging Middleware
 */
// HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Colorful dev format in console
} else {
  app.use(morgan('combined', { stream: logger.stream as any })); // Standard Apache format to logger
}

/**
 * Security Middleware
 */
// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Enable CORS
app.use(corsMiddleware);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' })); // parse incoming json data with size limit

/**
 * Routes
 */
app.use('/api/v1/auth', authRouter); // Auth routes (login, logout, refresh)
app.use('/api/v1/password', passwordRouter); // Password management routes
app.use('/api/v1/admins', adminRouter); // Admin routes
app.use('/api/v1/academic-years', academicYearRouter); // academic year routes
app.use('/api/v1/academic-terms', academicTermRouter); // academic term routes
app.use('/api/v1/class-levels', classLevelRouter); // Class level routes
app.use('/api/v1/programs', programRouter); // Program routes
app.use('/api/v1/subjects', subjectRouter); // Subject routes
app.use('/api/v1/year-groups', yearGroupRouter); // Year Group routes
app.use('/api/v1/teachers', teachersRouter); // Teachers routes
app.use('/api/v1/exams', examRouter); // Exams routes
app.use('/api/v1/students', studentRouter); // Student routes
app.use('/api/v1/questions', questionsRouter); // Question routes
app.use('/api/v1/exam-results', examResultRouter); // Question routes

/**
 * Error Middlewares
 */
app.use(notFoundErr);
app.use(globalErrHandler);

export default app;
