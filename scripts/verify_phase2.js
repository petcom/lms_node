#!/usr/bin/env node
/**
 * Phase 2: Authentication & Authorization Consolidation - Verification Tests
 * Tests unified authentication middleware and role-based access control
 */

const path = require('path');
const fs = require('fs');

console.log('\n🧪 Phase 2: Authentication & Authorization Verification Tests\n');
console.log('='.repeat(70));

let passedTests = 0;
let failedTests = 0;

// Helper function to run tests
const test = (description, assertion) => {
  try {
    assertion();
    console.log(`✅ ${description}`);
    passedTests++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    failedTests++;
  }
};

// Helper to check if file exists
const fileExists = (filePath) => {
  return fs.existsSync(path.resolve(__dirname, '..', filePath));
};

// Helper to check if file does NOT exist
const fileNotExists = (filePath) => {
  return !fs.existsSync(path.resolve(__dirname, '..', filePath));
};

// Helper to read file content
const readFile = (filePath) => {
  return fs.readFileSync(path.resolve(__dirname, '..', filePath), 'utf-8');
};

console.log('\n📁 File Structure Tests');
console.log('-'.repeat(70));

test('isAuthenticated.js exists and is the unified auth middleware', () => {
  if (!fileExists('middlewares/isAuthenticated.js')) {
    throw new Error('isAuthenticated.js not found');
  }
  const content = readFile('middlewares/isAuthenticated.js');
  if (!content.includes('Admin') || !content.includes('Teacher') || !content.includes('Student')) {
    throw new Error('isAuthenticated does not check all user types');
  }
});

test('roleRestriction.js exists and is enhanced', () => {
  if (!fileExists('middlewares/roleRestriction.js')) {
    throw new Error('roleRestriction.js not found');
  }
  const content = readFile('middlewares/roleRestriction.js');
  if (!content.includes('isValidRole') || !content.includes('403')) {
    throw new Error('roleRestriction not properly enhanced');
  }
});

test('roles.js constants file exists', () => {
  if (!fileExists('utils/roles.js')) {
    throw new Error('utils/roles.js not found');
  }
  const content = readFile('utils/roles.js');
  if (!content.includes('ROLES') || !content.includes('ROLE_PERMISSIONS')) {
    throw new Error('roles.js missing required constants');
  }
});

test('Deprecated isLogin.js has been removed', () => {
  if (!fileNotExists('middlewares/isLogin.js')) {
    throw new Error('isLogin.js still exists - should be deleted');
  }
});

test('Deprecated isTeacherLogin.js has been removed', () => {
  if (!fileNotExists('middlewares/isTeacherLogin.js')) {
    throw new Error('isTeacherLogin.js still exists - should be deleted');
  }
});

test('Deprecated isStudentLogin.js has been removed', () => {
  if (!fileNotExists('middlewares/isStudentLogin.js')) {
    throw new Error('isStudentLogin.js still exists - should be deleted');
  }
});

test('Deprecated isAdmin.js has been removed', () => {
  if (!fileNotExists('middlewares/isAdmin.js')) {
    throw new Error('isAdmin.js still exists - should be deleted');
  }
});

test('Deprecated isTeacher.js has been removed', () => {
  if (!fileNotExists('middlewares/isTeacher.js')) {
    throw new Error('isTeacher.js still exists - should be deleted');
  }
});

test('Deprecated isStudent.js has been removed', () => {
  if (!fileNotExists('middlewares/isStudent.js')) {
    throw new Error('isStudent.js still exists - should be deleted');
  }
});

console.log('\n🔍 Route Configuration Tests');
console.log('-'.repeat(70));

test('adminRouter uses unified isAuthenticated()', () => {
  if (!fileExists('routes/staff/adminRouter.js')) {
    throw new Error('adminRouter.js not found');
  }
  const content = readFile('routes/staff/adminRouter.js');
  if (content.includes('isLogin') || content.includes('isAuthenticated(Admin)')) {
    throw new Error('adminRouter still uses old authentication pattern');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('adminRouter not using unified authentication');
  }
});

test('staffRouter uses unified isAuthenticated()', () => {
  if (!fileExists('routes/staff/staffRouter.js')) {
    throw new Error('staffRouter.js not found');
  }
  const content = readFile('routes/staff/staffRouter.js');
  if (content.includes('isTeacherLogin') || content.includes('isAuthenticated(Teacher)')) {
    throw new Error('staffRouter still uses old authentication pattern');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('staffRouter not using unified authentication');
  }
});

test('studentRouter uses unified isAuthenticated()', () => {
  if (!fileExists('routes/students/studentRouter.js')) {
    throw new Error('studentRouter.js not found');
  }
  const content = readFile('routes/students/studentRouter.js');
  if (content.includes('isStudentLogin') || content.includes('isAuthenticated(Student)')) {
    throw new Error('studentRouter still uses old authentication pattern');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('studentRouter not using unified authentication');
  }
});

test('examRoutes uses unified isAuthenticated()', () => {
  if (!fileExists('routes/academics/examRoutes.js')) {
    throw new Error('examRoutes.js not found');
  }
  const content = readFile('routes/academics/examRoutes.js');
  if (content.includes('isTeacherLogin') || content.includes('isTeacher')) {
    throw new Error('examRoutes still uses old middleware');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('examRoutes not using unified authentication');
  }
});

test('questionRoutes uses unified isAuthenticated()', () => {
  if (!fileExists('routes/academics/questionRoutes.js')) {
    throw new Error('questionRoutes.js not found');
  }
  const content = readFile('routes/academics/questionRoutes.js');
  if (content.includes('isTeacherLogin') || content.includes('isTeacher')) {
    throw new Error('questionRoutes still uses old middleware');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('questionRoutes not using unified authentication');
  }
});

test('examResultsRoutes uses unified isAuthenticated()', () => {
  if (!fileExists('routes/academics/examResultsRoutes.js')) {
    throw new Error('examResultsRoutes.js not found');
  }
  const content = readFile('routes/academics/examResultsRoutes.js');
  if (content.includes('isStudentLogin') || content.includes('isStudent') || content.includes('isLogin') || content.includes('isAdmin')) {
    throw new Error('examResultsRoutes still uses old middleware');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('examResultsRoutes not using unified authentication');
  }
});

test('academicYear routes use unified isAuthenticated()', () => {
  if (!fileExists('routes/academics/academicYear.js')) {
    throw new Error('academicYear.js not found');
  }
  const content = readFile('routes/academics/academicYear.js');
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('academicYear not using unified authentication');
  }
});

test('academicTerm routes use unified isAuthenticated()', () => {
  if (!fileExists('routes/academics/academicTerm.js')) {
    throw new Error('academicTerm.js not found');
  }
  const content = readFile('routes/academics/academicTerm.js');
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('academicTerm not using unified authentication');
  }
});

test('classLevel routes use unified isAuthenticated()', () => {
  if (!fileExists('routes/academics/classLevel.js')) {
    throw new Error('classLevel.js not found');
  }
  const content = readFile('routes/academics/classLevel.js');
  if (content.includes('isLogin') || content.includes('isAdmin')) {
    throw new Error('classLevel still uses old middleware');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('classLevel not using unified authentication');
  }
});

test('program routes use unified isAuthenticated()', () => {
  if (!fileExists('routes/academics/program.js')) {
    throw new Error('program.js not found');
  }
  const content = readFile('routes/academics/program.js');
  if (content.includes('isLogin') || content.includes('isAdmin')) {
    throw new Error('program still uses old middleware');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('program not using unified authentication');
  }
});

test('subject routes use unified isAuthenticated()', () => {
  if (!fileExists('routes/academics/subject.js')) {
    throw new Error('subject.js not found');
  }
  const content = readFile('routes/academics/subject.js');
  if (content.includes('isLogin') || content.includes('isAdmin')) {
    throw new Error('subject still uses old middleware');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('subject not using unified authentication');
  }
});

test('yearGroup routes use unified isAuthenticated()', () => {
  if (!fileExists('routes/academics/yearGroup.js')) {
    throw new Error('yearGroup.js not found');
  }
  const content = readFile('routes/academics/yearGroup.js');
  if (content.includes('isLogin') || content.includes('isAdmin')) {
    throw new Error('yearGroup still uses old middleware');
  }
  if (!content.includes('isAuthenticated()') || !content.includes('roleRestriction')) {
    throw new Error('yearGroup not using unified authentication');
  }
});

console.log('\n🔧 Middleware Logic Tests');
console.log('-'.repeat(70));

test('isAuthenticated exports a function factory', () => {
  const content = readFile('middlewares/isAuthenticated.js');
  if (!content.includes('const isAuthenticated =') || !content.includes('module.exports = isAuthenticated')) {
    throw new Error('isAuthenticated not properly exported');
  }
  if (!content.includes('return async (req, res, next)')) {
    throw new Error('isAuthenticated should return async middleware function');
  }
});

test('roleRestriction accepts multiple roles', () => {
  const roleRestriction = require('../middlewares/roleRestriction');
  if (typeof roleRestriction !== 'function') {
    throw new Error('roleRestriction should export a function');
  }
  const middleware = roleRestriction('admin', 'teacher');
  if (typeof middleware !== 'function') {
    throw new Error('roleRestriction(...roles) should return middleware function');
  }
});

test('roles.js exports required constants', () => {
  const roles = require('../utils/roles');
  if (!roles.ROLES || !roles.ROLE_HIERARCHY || !roles.ROLE_PERMISSIONS) {
    throw new Error('roles.js missing required exports');
  }
  if (roles.ROLES.ADMIN !== 'admin' || roles.ROLES.TEACHER !== 'teacher' || roles.ROLES.STUDENT !== 'student') {
    throw new Error('ROLES constants have incorrect values');
  }
});

test('roles.js exports utility functions', () => {
  const roles = require('../utils/roles');
  if (typeof roles.hasPermission !== 'function') {
    throw new Error('hasPermission function not exported');
  }
  if (typeof roles.isValidRole !== 'function') {
    throw new Error('isValidRole function not exported');
  }
  if (typeof roles.getAllRoles !== 'function') {
    throw new Error('getAllRoles function not exported');
  }
});

test('isValidRole correctly validates roles', () => {
  const { isValidRole } = require('../utils/roles');
  if (!isValidRole('admin')) {
    throw new Error('admin should be a valid role');
  }
  if (!isValidRole('teacher')) {
    throw new Error('teacher should be a valid role');
  }
  if (!isValidRole('student')) {
    throw new Error('student should be a valid role');
  }
  if (isValidRole('invalid')) {
    throw new Error('invalid should not be a valid role');
  }
});

test('getAllRoles returns all role values', () => {
  const { getAllRoles } = require('../utils/roles');
  const allRoles = getAllRoles();
  if (!Array.isArray(allRoles)) {
    throw new Error('getAllRoles should return an array');
  }
  if (allRoles.length !== 3) {
    throw new Error('Should have exactly 3 roles');
  }
  if (!allRoles.includes('admin') || !allRoles.includes('teacher') || !allRoles.includes('student')) {
    throw new Error('getAllRoles missing required role values');
  }
});

console.log('\n' + '='.repeat(70));
console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);

if (failedTests === 0) {
  console.log('🎉 All tests passed! Phase 2 verification complete.\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review and fix the issues.\n');
  process.exit(1);
}
