const express     = require('express');
const {globalErrHandler, notFoundErr} = require('../middlewares/globalErrHandler');

const authRouter = require('../routes/auth/authRoutes');
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

const app  = express(); //  create application instance of express

/**
 * Middleware
 */
app.use(express.json()); // pass incoming json data

/**
 * Routes
 */
app.use("/api/v1/auth", authRouter); // Auth routes (login, logout, refresh)
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