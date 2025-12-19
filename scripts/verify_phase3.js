#!/usr/bin/env node
/**
 * Phase 3: Error Handling Standardization - Verification Tests
 * Tests custom error classes and global error handler
 */

const path = require('path');
const fs = require('fs');

console.log('\n🧪 Phase 3: Error Handling Standardization Verification Tests\n');
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

// Helper to read file content
const readFile = (filePath) => {
  return fs.readFileSync(path.resolve(__dirname, '..', filePath), 'utf-8');
};

console.log('\n📁 Error Class Files');
console.log('-'.repeat(70));

test('AppError base class exists', () => {
  if (!fileExists('utils/errors/AppError.js')) {
    throw new Error('AppError.js not found');
  }
  const content = readFile('utils/errors/AppError.js');
  if (!content.includes('class AppError extends Error')) {
    throw new Error('AppError does not extend Error');
  }
});

test('ValidationError class exists', () => {
  if (!fileExists('utils/errors/ValidationError.js')) {
    throw new Error('ValidationError.js not found');
  }
  const content = readFile('utils/errors/ValidationError.js');
  if (!content.includes('class ValidationError extends AppError')) {
    throw new Error('ValidationError does not extend AppError');
  }
});

test('AuthenticationError class exists', () => {
  if (!fileExists('utils/errors/AuthenticationError.js')) {
    throw new Error('AuthenticationError.js not found');
  }
  const content = readFile('utils/errors/AuthenticationError.js');
  if (!content.includes('class AuthenticationError extends AppError')) {
    throw new Error('AuthenticationError does not extend AppError');
  }
});

test('AuthorizationError class exists', () => {
  if (!fileExists('utils/errors/AuthorizationError.js')) {
    throw new Error('AuthorizationError.js not found');
  }
  const content = readFile('utils/errors/AuthorizationError.js');
  if (!content.includes('class AuthorizationError extends AppError')) {
    throw new Error('AuthorizationError does not extend AppError');
  }
});

test('NotFoundError class exists', () => {
  if (!fileExists('utils/errors/NotFoundError.js')) {
    throw new Error('NotFoundError.js not found');
  }
  const content = readFile('utils/errors/NotFoundError.js');
  if (!content.includes('class NotFoundError extends AppError')) {
    throw new Error('NotFoundError does not extend AppError');
  }
});

test('DatabaseError class exists', () => {
  if (!fileExists('utils/errors/DatabaseError.js')) {
    throw new Error('DatabaseError.js not found');
  }
  const content = readFile('utils/errors/DatabaseError.js');
  if (!content.includes('class DatabaseError extends AppError')) {
    throw new Error('DatabaseError does not extend AppError');
  }
});

test('ConflictError class exists', () => {
  if (!fileExists('utils/errors/ConflictError.js')) {
    throw new Error('ConflictError.js not found');
  }
  const content = readFile('utils/errors/ConflictError.js');
  if (!content.includes('class ConflictError extends AppError')) {
    throw new Error('ConflictError does not extend AppError');
  }
});

test('Error index exports all error classes', () => {
  if (!fileExists('utils/errors/index.js')) {
    throw new Error('utils/errors/index.js not found');
  }
  const content = readFile('utils/errors/index.js');
  const requiredExports = ['AppError', 'ValidationError', 'AuthenticationError', 'AuthorizationError', 'NotFoundError', 'DatabaseError', 'ConflictError'];
  requiredExports.forEach(exp => {
    if (!content.includes(exp)) {
      throw new Error(`Missing export: ${exp}`);
    }
  });
});

console.log('\n🔧 Global Error Handler');
console.log('-'.repeat(70));

test('globalErrHandler enhanced with environment handling', () => {
  const content = readFile('middlewares/globalErrHandler.js');
  if (!content.includes('sendErrorDev') || !content.includes('sendErrorProd')) {
    throw new Error('Missing environment-specific error handlers');
  }
  if (!content.includes('NODE_ENV')) {
    throw new Error('Not checking NODE_ENV for environment-specific behavior');
  }
});

test('globalErrHandler handles MongoDB errors', () => {
  const content = readFile('middlewares/globalErrHandler.js');
  if (!content.includes('CastError') || !content.includes('ValidationError')) {
    throw new Error('Missing MongoDB error handling');
  }
  if (!content.includes('11000')) {
    throw new Error('Missing duplicate key error handling');
  }
});

test('globalErrHandler handles JWT errors', () => {
  const content = readFile('middlewares/globalErrHandler.js');
  if (!content.includes('JsonWebTokenError') || !content.includes('TokenExpiredError')) {
    throw new Error('Missing JWT error handling');
  }
});

test('globalErrHandler sanitizes errors in production', () => {
  const content = readFile('middlewares/globalErrHandler.js');
  if (!content.includes('isOperational')) {
    throw new Error('Not checking if errors are operational');
  }
  if (!content.includes('Something went wrong')) {
    throw new Error('Missing generic production error message');
  }
});

test('notFoundErr uses AppError', () => {
  const content = readFile('middlewares/globalErrHandler.js');
  if (!content.includes('new AppError') || !content.includes('404')) {
    throw new Error('notFoundErr not using AppError with 404 status');
  }
});

console.log('\n🔄 Middleware Integration');
console.log('-'.repeat(70));

test('isAuthenticated uses custom error classes', () => {
  const content = readFile('middlewares/isAuthenticated.js');
  if (!content.includes('AuthenticationError') || !content.includes('NotFoundError')) {
    throw new Error('isAuthenticated not using custom error classes');
  }
  if (!content.includes('require("../utils/errors")')) {
    throw new Error('isAuthenticated not importing error classes');
  }
});

test('roleRestriction uses custom error classes', () => {
  const content = readFile('middlewares/roleRestriction.js');
  if (!content.includes('AuthenticationError') || !content.includes('AuthorizationError')) {
    throw new Error('roleRestriction not using custom error classes');
  }
  if (!content.includes('require("../utils/errors")')) {
    throw new Error('roleRestriction not importing error classes');
  }
});

test('app.js uses globalErrHandler', () => {
  const content = readFile('app/app.js');
  if (!content.includes('globalErrHandler')) {
    throw new Error('app.js not using globalErrHandler');
  }
  if (!content.includes('notFoundErr')) {
    throw new Error('app.js not using notFoundErr');
  }
});

console.log('\n✨ Error Class Functionality');
console.log('-'.repeat(70));

test('AppError class works correctly', () => {
  const { AppError } = require('../utils/errors');
  const error = new AppError('Test error', 400);
  if (!(error instanceof Error)) {
    throw new Error('AppError is not an instance of Error');
  }
  if (error.statusCode !== 400) {
    throw new Error('AppError statusCode not set correctly');
  }
  if (error.status !== 'fail') {
    throw new Error('AppError status not set correctly for 4xx');
  }
  if (!error.isOperational) {
    throw new Error('AppError isOperational should default to true');
  }
});

test('ValidationError has correct status code', () => {
  const { ValidationError } = require('../utils/errors');
  const error = new ValidationError('Invalid data');
  if (error.statusCode !== 400) {
    throw new Error('ValidationError should have status code 400');
  }
  if (error.name !== 'ValidationError') {
    throw new Error('ValidationError name not set correctly');
  }
});

test('AuthenticationError has correct status code', () => {
  const { AuthenticationError } = require('../utils/errors');
  const error = new AuthenticationError();
  if (error.statusCode !== 401) {
    throw new Error('AuthenticationError should have status code 401');
  }
  if (error.name !== 'AuthenticationError') {
    throw new Error('AuthenticationError name not set correctly');
  }
});

test('AuthorizationError has correct status code', () => {
  const { AuthorizationError } = require('../utils/errors');
  const error = new AuthorizationError();
  if (error.statusCode !== 403) {
    throw new Error('AuthorizationError should have status code 403');
  }
  if (error.name !== 'AuthorizationError') {
    throw new Error('AuthorizationError name not set correctly');
  }
});

test('NotFoundError has correct status code', () => {
  const { NotFoundError } = require('../utils/errors');
  const error = new NotFoundError('User', '123');
  if (error.statusCode !== 404) {
    throw new Error('NotFoundError should have status code 404');
  }
  if (error.name !== 'NotFoundError') {
    throw new Error('NotFoundError name not set correctly');
  }
  if (!error.message.includes('User') || !error.message.includes('123')) {
    throw new Error('NotFoundError message not formatted correctly');
  }
});

test('DatabaseError has correct status code', () => {
  const { DatabaseError } = require('../utils/errors');
  const error = new DatabaseError();
  if (error.statusCode !== 500) {
    throw new Error('DatabaseError should have status code 500');
  }
  if (error.name !== 'DatabaseError') {
    throw new Error('DatabaseError name not set correctly');
  }
});

test('ConflictError has correct status code', () => {
  const { ConflictError } = require('../utils/errors');
  const error = new ConflictError();
  if (error.statusCode !== 409) {
    throw new Error('ConflictError should have status code 409');
  }
  if (error.name !== 'ConflictError') {
    throw new Error('ConflictError name not set correctly');
  }
});

console.log('\n' + '='.repeat(70));
console.log(`\n📊 Test Results: ${passedTests} passed, ${failedTests} failed\n`);

if (failedTests === 0) {
  console.log('🎉 All tests passed! Phase 3 verification complete.\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review and fix the issues.\n');
  process.exit(1);
}
