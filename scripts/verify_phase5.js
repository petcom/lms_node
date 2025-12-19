/**
 * Phase 5: Code Quality Improvements - Verification Script
 * Validates that all code quality improvements have been implemented correctly
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.yellow}${msg}${colors.reset}`)
};

let testsPassed = 0;
let testsFailed = 0;

function test(description, assertion) {
  try {
    if (assertion()) {
      log.success(description);
      testsPassed++;
      return true;
    } else {
      log.error(description);
      testsFailed++;
      return false;
    }
  } catch (error) {
    log.error(`${description} - ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Test 5.1: Code Duplication Removal
log.section('5.1: Verify Utilities Exist');

test('utils/helpers.js exports hashPassword', () => {
  const helpers = require('../utils/helpers');
  return typeof helpers.hashPassword === 'function';
});

test('utils/helpers.js exports isPassMatched', () => {
  const helpers = require('../utils/helpers');
  return typeof helpers.isPassMatched === 'function';
});

test('Password utilities properly integrated', () => {
  const helpers = require('../utils/helpers');
  // Check that hashPassword is async
  const result = helpers.hashPassword;
  return result.constructor.name === 'AsyncFunction';
});

// Test 5.2: Response Standardization
log.section('5.2: Verify Response Utilities');

test('utils/response.js exists', () => {
  return fs.existsSync(path.join(__dirname, '../utils/response.js'));
});

test('utils/response.js exports successResponse', () => {
  const response = require('../utils/response');
  return typeof response.successResponse === 'function';
});

test('utils/response.js exports paginatedResponse', () => {
  const response = require('../utils/response');
  return typeof response.paginatedResponse === 'function';
});

test('utils/response.js exports createdResponse', () => {
  const response = require('../utils/response');
  return typeof response.createdResponse === 'function';
});

test('utils/response.js exports noContentResponse', () => {
  const response = require('../utils/response');
  return typeof response.noContentResponse === 'function';
});

// Test 5.3: Database Indexes
log.section('5.3: Verify Database Indexes');

test('Admin model has email index', () => {
  const Admin = require('../model/Staff/Admin');
  const indexes = Admin.schema.indexes();
  return indexes.some(idx => idx[0].email !== undefined);
});

test('Student model has email index', () => {
  const Student = require('../model/Academic/Student');
  const indexes = Student.schema.indexes();
  return indexes.some(idx => idx[0].email !== undefined);
});

test('Student model has studentId index', () => {
  const Student = require('../model/Academic/Student');
  const indexes = Student.schema.indexes();
  return indexes.some(idx => idx[0].studentId !== undefined);
});

test('Teacher model has email index', () => {
  const Teacher = require('../model/Staff/Teacher');
  const indexes = Teacher.schema.indexes();
  return indexes.some(idx => idx[0].email !== undefined);
});

test('Teacher model has teacherId index', () => {
  const Teacher = require('../model/Staff/Teacher');
  const indexes = Teacher.schema.indexes();
  return indexes.some(idx => idx[0].teacherId !== undefined);
});

test('Exam model has subject index', () => {
  const Exam = require('../model/Academic/Exam');
  const indexes = Exam.schema.indexes();
  return indexes.some(idx => idx[0].subject !== undefined);
});

test('ExamResult model has studentID index', () => {
  const ExamResult = require('../model/Academic/ExamResults');
  const indexes = ExamResult.schema.indexes();
  return indexes.some(idx => idx[0].studentID !== undefined);
});

test('ExamResult model has compound index (studentID + exam)', () => {
  const ExamResult = require('../model/Academic/ExamResults');
  const indexes = ExamResult.schema.indexes();
  return indexes.some(idx => idx[0].studentID !== undefined && idx[0].exam !== undefined);
});

test('AcademicYear model has name index', () => {
  const AcademicYear = require('../model/Academic/AcademicYear');
  const indexes = AcademicYear.schema.indexes();
  return indexes.some(idx => idx[0].name !== undefined);
});

// Test 5.4: Code Documentation
log.section('5.4: Verify JSDoc Documentation');

test('isAuthenticated middleware has JSDoc', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../middlewares/isAuthenticated.js'), 'utf8');
  return fileContent.includes('@param') && fileContent.includes('@returns');
});

test('roleRestriction middleware has JSDoc', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../middlewares/roleRestriction.js'), 'utf8');
  return fileContent.includes('@param') && fileContent.includes('@returns') && fileContent.includes('@example');
});

test('validate middleware has JSDoc', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../middlewares/validate.js'), 'utf8');
  return fileContent.includes('@param') && fileContent.includes('@returns');
});

test('generateToken utility has JSDoc', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../utils/generateToken.js'), 'utf8');
  return fileContent.includes('@param') && fileContent.includes('@returns');
});

test('verifyToken utility has JSDoc', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../utils/verifyToken.js'), 'utf8');
  return fileContent.includes('@param') && fileContent.includes('@returns') && fileContent.includes('@throws');
});

test('hashPassword utility has JSDoc', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../utils/helpers.js'), 'utf8');
  return fileContent.includes('@param') && fileContent.includes('@returns') && fileContent.includes('Hash password');
});

test('response utilities have JSDoc', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../utils/response.js'), 'utf8');
  const hasSuccessDoc = fileContent.includes('Send a successful response');
  const hasPaginatedDoc = fileContent.includes('Send a paginated response');
  return hasSuccessDoc && hasPaginatedDoc;
});

test('roles utility has JSDoc', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../utils/roles.js'), 'utf8');
  return fileContent.includes('@param') && fileContent.includes('@returns');
});

// Additional Quality Checks
log.section('Additional Code Quality Checks');

test('Password utilities validate before hashing', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../utils/helpers.js'), 'utf8');
  return fileContent.includes('validatePassword') && fileContent.includes('isValid');
});

test('Response utilities use consistent structure', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../utils/response.js'), 'utf8');
  return fileContent.includes("status: 'success'") && fileContent.includes('message');
});

test('Models have timestamps enabled', () => {
  const Student = require('../model/Academic/Student');
  const Teacher = require('../model/Staff/Teacher');
  const Admin = require('../model/Staff/Admin');
  return Student.schema.options.timestamps && 
         Teacher.schema.options.timestamps && 
         Admin.schema.options.timestamps;
});

test('Compound indexes for common query patterns', () => {
  const Student = require('../model/Academic/Student');
  const ExamResult = require('../model/Academic/ExamResults');
  const studentIndexes = Student.schema.indexes();
  const examResultIndexes = ExamResult.schema.indexes();
  
  // Check for compound indexes
  const hasCompoundStudent = studentIndexes.some(idx => 
    Object.keys(idx[0]).length > 1
  );
  const hasCompoundExamResult = examResultIndexes.some(idx => 
    Object.keys(idx[0]).length > 1
  );
  
  return hasCompoundStudent && hasCompoundExamResult;
});

// Summary
log.section('Test Summary');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);

if (testsFailed === 0) {
  console.log(`\n${colors.green}🎉 All Phase 5 tests passed!${colors.reset}`);
  process.exit(0);
} else {
  console.log(`\n${colors.red}❌ Some tests failed. Please review the output above.${colors.reset}`);
  process.exit(1);
}
