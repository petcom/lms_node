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
import programRouter from '../routes/academics/program';
import programLevelRouter from '../routes/academics/programLevel';
import courseRouter from '../routes/academics/course';
import courseContentRouter from '../routes/academics/courseContent';
import programEnrollmentRouter from '../routes/academics/programEnrollment';
import classEnrollmentRouter from '../routes/academics/classEnrollment';
import courseEnrollmentRouter from '../routes/academics/courseEnrollment';
import yearGroupRouter from '../routes/academics/yearGroup';
import staffRouter from '../routes/staff/staffRouter';
import examRouter from '../routes/academics/examRoutes';
import learnerRouter from '../routes/learners/learnerRouter';
import questionsRouter from '../routes/academics/questionRoutes';
import examResultRouter from '../routes/academics/examResultsRoutes';
import scormPackageRouter from '../routes/scorm/scormPackageRoutes';
import scormContentRouter from '../routes/scorm/scormContentRoutes';
import scormAttemptRouter from '../routes/scorm/scormAttemptRoutes';
import scormRuntimeRouter from '../routes/scorm/scormRuntimeRoutes';
import scormPlayerRouter from '../routes/scorm/scormPlayerRoutes';
import scormReportRouter from '../routes/scorm/scormReportRoutes';
import scormHealthRouter from '../routes/scorm/scormHealthRoutes';
import metricsRouter from '../routes/metricsRouter';
import departmentRouter from '../routes/departments/departmentRoutes';
import permissionsRouter from '../routes/permissionsRouter';
import departmentResourcesRouter from '../routes/departmentResources/departmentResourcesRouter';
import contentRouter from '../routes/content/contentRouter';
import templatesRouter from '../routes/templates/templatesRouter';
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
} else if (process.env.NODE_ENV !== 'test') {
  // In test mode skip morgan to avoid stream issues with supertest
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

// Apply rate limiting to all API routes (skip in tests)
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/', apiLimiter);
}

/**
 * Body Parser Middleware
 */
app.use(express.json({ limit: '10mb' })); // parse incoming json data with size limit

/**
 * Static File Serving
 */
// Serve SCORM API JavaScript files
app.use(
  '/scorm',
  express.static('public/scorm', {
    maxAge: '1d',
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    },
  })
);

/**
 * Routes
 */
app.use('/api/v1/auth', authRouter); // Auth routes (login, logout, refresh)
app.use('/api/v1/password', passwordRouter); // Password management routes
app.use('/api/v1/staff/admins', adminRouter); // Global admin routes
app.use('/api/v1/academic-years', academicYearRouter); // academic year routes
app.use('/api/v1/academic-terms', academicTermRouter); // academic term routes
app.use('/api/v1/programs', programRouter); // Program routes
app.use('/api/v1/program-levels', programLevelRouter); // Program level routes
app.use('/api/v1/courses', courseRouter); // Course routes
app.use('/api/v1/course-contents', courseContentRouter); // Course content routes
app.use('/api/v1/program-enrollments', programEnrollmentRouter); // Program enrollment routes
app.use('/api/v1/class-enrollments', classEnrollmentRouter); // Class enrollment routes
app.use('/api/v1/course-enrollments', courseEnrollmentRouter); // Course enrollment routes
app.use('/api/v1/year-groups', yearGroupRouter); // Year Group routes
app.use('/api/v1/staff', staffRouter); // Staff routes
app.use('/api/v1/exams', examRouter); // Exams routes
app.use('/api/v1/learners', learnerRouter); // Learner routes
app.use('/api/v1/questions', questionsRouter); // Question routes
app.use('/api/v1/exam-results', examResultRouter); // Exam results routes
app.use('/api/v1/content/scorm/packages', scormPackageRouter); // Content SCORM package management
app.use('/api/v1/content/scorm/content', scormContentRouter); // Content SCORM content delivery
app.use('/api/v1/content/scorm/attempts', scormAttemptRouter); // Content SCORM attempt tracking
app.use('/api/v1/content/scorm/runtime', scormRuntimeRouter); // Content SCORM runtime API
app.use('/api/v1/content/scorm/player', scormPlayerRouter); // Content SCORM player interface
app.use('/api/v1/content/scorm/reports', scormReportRouter); // Content SCORM tracking and reporting
app.use('/api/v1/content/scorm', scormHealthRouter); // Content SCORM health and monitoring
app.use('/api/v1/metrics', metricsRouter); // Platform metrics summary
app.use('/api/v1/departments', departmentRouter); // Department hierarchy management
app.use('/api/v1/department-resources', departmentResourcesRouter); // Department resources overview
app.use('/api/v1/permissions', permissionsRouter); // Permissions matrix
app.use('/api/v1/content', contentRouter); // Unified content API
app.use('/api/v1/templates', templatesRouter); // Master templates

// Legacy front-end path fallback to avoid 404s when SCORM player redirects
app.get('/learner/dashboard', (_req, res) => res.redirect('/'));

/**
 * Error Middlewares
 */
app.use(notFoundErr);
app.use(globalErrHandler);

export default app;
(module as any).exports = app;
