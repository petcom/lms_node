const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const corsMiddleware = require('../config/cors');
const swaggerSpecs = require('../config/swagger');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { globalErrHandler, notFoundErr } = require('../middlewares/globalErrHandler');
const logger = require('../utils/logger');

const authRouter = require('../routes/auth/authRoutes');
const passwordRouter = require('../routes/auth/passwordRoutes');
const adminRouter = require('../routes/staff/adminRouter');
const academicYearRouter = require('../routes/academics/academicYear');
const academicTermRouter = require('../routes/academics/academicTerm');
const classLevelRouter = require('../routes/academics/classLevel');
const programRouter = require('../routes/academics/program');
const subjectRouter = require('../routes/academics/subject');
const yearGroupRouter = require('../routes/academics/yearGroup');
const teachersRouter = require('../routes/staff/teacherRouter');
const examRouter = require('../routes/academics/examRoutes');
const studentRouter = require('../routes/students/studentRouter');
const questionsRouter = require('../routes/academics/questionRoutes');
const examResultRouter = require('../routes/academics/examResultsRoutes');
const { healthCheck, readyCheck } = require('../controller/healthCtrl');

const app = express(); // create application instance of express

/**
 * Health Check Routes (before other middleware for reliability)
 */
app.get('/health', healthCheck);
app.get('/ready', readyCheck);

/**
 * API Documentation (Swagger)
 */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customSiteTitle: 'LMS API Documentation',
  customCss: '.swagger-ui .topbar { display: none }'
}));

/**
 * Performance Optimization
 */
// Gzip compression for responses
app.use(compression({
  level: 6, // Compression level (0-9, 6 is default)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

/**
 * Logging Middleware
 */
// HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Colorful dev format in console
} else {
  app.use(morgan('combined', { stream: logger.stream })); // Standard Apache format to logger
}

/**
 * Security Middleware
 */
// Set security HTTP headers
app.use(helmet({
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
}));

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
app.use("/api/v1/auth", authRouter); // Auth routes (login, logout, refresh)
app.use("/api/v1/password", passwordRouter); // Password management routes
app.use("/api/v1/admins", adminRouter); // Admin routes
app.use("/api/v1/academic-years", academicYearRouter); // academic year routes
app.use("/api/v1/academic-terms", academicTermRouter); // academic term routes
app.use("/api/v1/class-levels", classLevelRouter); // Class level routes
app.use("/api/v1/programs", programRouter); // Program routes
app.use("/api/v1/subjects", subjectRouter); // Subject routes
app.use("/api/v1/year-groups", yearGroupRouter); // Year Group routes
app.use("/api/v1/teachers", teachersRouter); // Teachers routes
app.use("/api/v1/exams", examRouter); // Exams routes
app.use("/api/v1/students", studentRouter); // Student routes
app.use("/api/v1/questions", questionsRouter); // Question routes
app.use("/api/v1/exam-results", examResultRouter); // Question routes

/**
 * Error Middlewares
 */
app.use(notFoundErr);
app.use(globalErrHandler);

module.exports = app;