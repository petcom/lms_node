const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const corsMiddleware = require('../config/cors');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { globalErrHandler, notFoundErr } = require('../middlewares/globalErrHandler');

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

const app = express(); // create application instance of express

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