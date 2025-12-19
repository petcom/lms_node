/**
 * Phase 4: Input Validation Verification Tests
 * Tests the Joi validation infrastructure
 */

const Joi = require('joi');
const validate = require('./middlewares/validate');
const authValidation = require('./validators/authValidation');
const academicValidation = require('./validators/academicValidation');
const studentValidation = require('./validators/studentValidation');
const staffValidation = require('./validators/staffValidation');
const ValidationError = require('./utils/errors/ValidationError');

console.log('\n🧪 Phase 4: Input Validation Tests\n');
console.log('=' .repeat(50));

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test 1: Joi package installed
test('Joi package is installed', () => {
  if (!Joi) throw new Error('Joi not found');
  if (typeof Joi.object !== 'function') throw new Error('Joi.object is not a function');
});

// Test 2: Validation middleware exists
test('Validation middleware exists and is a function', () => {
  if (typeof validate !== 'function') throw new Error('validate is not a function');
});

// Test 3: ValidationError class exists
test('ValidationError class exists', () => {
  if (!ValidationError) throw new Error('ValidationError not found');
  const error = new ValidationError('Test error');
  if (error.statusCode !== 400) throw new Error('ValidationError statusCode should be 400');
});

// Test 4: Auth validation schemas exist
test('Auth validation schemas exported', () => {
  const required = ['registerAdmin', 'registerTeacher', 'registerStudent', 'login', 
                    'changePassword', 'forgotPassword', 'resetPassword'];
  required.forEach(schema => {
    if (!authValidation[schema]) throw new Error(`${schema} not found in authValidation`);
  });
});

// Test 5: Academic validation schemas exist
test('Academic validation schemas exported', () => {
  const required = ['createAcademicYear', 'createExam', 'createQuestion', 'idParam'];
  required.forEach(schema => {
    if (!academicValidation[schema]) throw new Error(`${schema} not found in academicValidation`);
  });
});

// Test 6: Student validation schemas exist
test('Student validation schemas exported', () => {
  const required = ['updateProfile', 'submitExam', 'writeExam'];
  required.forEach(schema => {
    if (!studentValidation[schema]) throw new Error(`${schema} not found in studentValidation`);
  });
});

// Test 7: Staff validation schemas exist
test('Staff validation schemas exported', () => {
  const required = ['updateAdminProfile', 'updateTeacherProfile', 'staffAction'];
  required.forEach(schema => {
    if (!staffValidation[schema]) throw new Error(`${schema} not found in staffValidation`);
  });
});

// Test 8: Email validation works
test('Email validation accepts valid emails', () => {
  const schema = Joi.object({ email: Joi.string().email().required() });
  const valid = ['test@example.com', 'user.name@domain.co.uk', 'admin@school.edu'];
  
  valid.forEach(email => {
    const { error } = schema.validate({ email });
    if (error) throw new Error(`Valid email rejected: ${email}`);
  });
});

// Test 9: Email validation rejects invalid emails
test('Email validation rejects invalid emails', () => {
  const schema = Joi.object({ email: Joi.string().email().required() });
  const invalid = ['notanemail', 'missing@domain', '@nodomain.com', 'spaces in@email.com'];
  
  invalid.forEach(email => {
    const { error } = schema.validate({ email });
    if (!error) throw new Error(`Invalid email accepted: ${email}`);
  });
});

// Test 10: Password validation enforces complexity
test('Password validation enforces complexity requirements', () => {
  const schema = authValidation.registerAdmin.body;
  
  // Weak passwords should fail
  const weak = [
    { password: 'short', passwordConfirmation: 'short' },
    { password: 'nouppercase1!', passwordConfirmation: 'nouppercase1!' },
    { password: 'NOLOWERCASE1!', passwordConfirmation: 'NOLOWERCASE1!' },
    { password: 'NoNumbers!', passwordConfirmation: 'NoNumbers!' },
    { password: 'NoSpecial1', passwordConfirmation: 'NoSpecial1' },
  ];
  
  weak.forEach((data, i) => {
    const { error } = schema.validate({ 
      name: 'Test User', 
      email: 'test@example.com', 
      ...data 
    });
    if (!error) throw new Error(`Weak password ${i + 1} was accepted`);
  });
});

// Test 11: Password validation accepts strong passwords
test('Password validation accepts strong passwords', () => {
  const schema = authValidation.registerAdmin.body;
  
  const { error } = schema.validate({
    name: 'Test User',
    email: 'test@example.com',
    password: 'StrongPass123!',
    passwordConfirmation: 'StrongPass123!',
  });
  
  if (error) throw new Error(`Strong password rejected: ${error.message}`);
});

// Test 12: Password confirmation must match
test('Password confirmation validation works', () => {
  const schema = authValidation.registerAdmin.body;
  
  const { error } = schema.validate({
    name: 'Test User',
    email: 'test@example.com',
    password: 'StrongPass123!',
    passwordConfirmation: 'DifferentPass123!',
  });
  
  if (!error) throw new Error('Mismatched passwords were accepted');
  if (!error.message.includes('match')) throw new Error('Error message should mention mismatch');
});

// Test 13: ObjectId validation
test('ObjectId validation accepts valid ObjectIds', () => {
  const schema = Joi.object({ id: academicValidation.idParam.params.extract('id') });
  
  const validIds = [
    '507f1f77bcf86cd799439011',
    '123456789012345678901234',
    'abcdef123456789012345678',
  ];
  
  validIds.forEach(id => {
    const { error } = academicValidation.idParam.params.validate({ id });
    if (error) throw new Error(`Valid ObjectId rejected: ${id}`);
  });
});

// Test 14: ObjectId validation rejects invalid IDs
test('ObjectId validation rejects invalid IDs', () => {
  const invalidIds = [
    'short',
    '12345',
    'not-a-valid-objectid-at-all',
    '507f1f77bcf86cd79943901g', // has 'g'
  ];
  
  invalidIds.forEach(id => {
    const { error } = academicValidation.idParam.params.validate({ id });
    if (!error) throw new Error(`Invalid ObjectId accepted: ${id}`);
  });
});

// Test 15: Academic year format validation
test('Academic year validation enforces format', () => {
  const schema = academicValidation.createAcademicYear.body;
  
  // Valid format
  const valid = { 
    name: '2024-2025', 
    fromYear: '2024-09-01', 
    toYear: '2025-06-30' 
  };
  const { error: validError } = schema.validate(valid);
  if (validError) throw new Error(`Valid academic year rejected: ${validError.message}`);
  
  // Invalid formats
  const invalid = [
    { name: '2024', fromYear: '2024-09-01', toYear: '2025-06-30' },
    { name: '2024-2026', fromYear: '2024-09-01', toYear: '2026-06-30' }, // not consecutive
    { name: '24-25', fromYear: '2024-09-01', toYear: '2025-06-30' },
  ];
  
  invalid.forEach((data, i) => {
    const { error } = schema.validate(data);
    if (!error) throw new Error(`Invalid academic year format ${i + 1} was accepted`);
  });
});

// Test 16: Exam validation
test('Exam validation enforces required fields', () => {
  const schema = academicValidation.createExam.body;
  
  // Missing required fields
  const { error } = schema.validate({
    name: 'Test Exam',
    // missing subject, program, academicTerm, etc.
  });
  
  if (!error) throw new Error('Incomplete exam data was accepted');
});

// Test 17: Exam duration validation
test('Exam duration validation enforces reasonable limits', () => {
  const schema = academicValidation.createExam.body;
  
  const baseExam = {
    name: 'Test Exam',
    subject: '507f1f77bcf86cd799439011',
    program: '507f1f77bcf86cd799439012',
    academicTerm: '507f1f77bcf86cd799439013',
    examDate: '2024-12-20',
    examTime: '09:00',
    examType: 'final',
    passMark: 50,
    totalMark: 100,
  };
  
  // Valid duration
  const { error: valid } = schema.validate({ ...baseExam, duration: 120 });
  if (valid) throw new Error('Valid duration rejected');
  
  // Too short
  const { error: tooShort } = schema.validate({ ...baseExam, duration: 0 });
  if (!tooShort) throw new Error('Duration 0 was accepted');
  
  // Too long
  const { error: tooLong } = schema.validate({ ...baseExam, duration: 500 });
  if (!tooLong) throw new Error('Duration > 480 was accepted');
});

// Test 18: Question validation
test('Question validation requires all options', () => {
  const schema = academicValidation.createQuestion.body;
  
  // Missing option D
  const { error } = schema.validate({
    question: 'What is 2+2?',
    optionA: '3',
    optionB: '4',
    optionC: '5',
    // missing optionD
    correctAnswer: 'B',
    mark: 1,
  });
  
  if (!error) throw new Error('Question without all options was accepted');
});

// Test 19: Answer validation restricts to A-D
test('Correct answer validation restricts to A, B, C, D', () => {
  const schema = academicValidation.createQuestion.body;
  
  const baseQuestion = {
    question: 'What is 2+2?',
    optionA: '3',
    optionB: '4',
    optionC: '5',
    optionD: '6',
    mark: 1,
  };
  
  // Valid answers
  ['A', 'B', 'C', 'D'].forEach(answer => {
    const { error } = schema.validate({ ...baseQuestion, correctAnswer: answer });
    if (error) throw new Error(`Valid answer ${answer} rejected`);
  });
  
  // Invalid answers
  const { error } = schema.validate({ ...baseQuestion, correctAnswer: 'E' });
  if (!error) throw new Error('Invalid answer E was accepted');
});

// Test 20: Validation middleware error handling
test('Validation middleware throws ValidationError on failure', () => {
  const mockReq = {
    body: { email: 'invalid-email' },
    params: {},
    query: {},
  };
  const mockRes = {};
  const mockNext = () => {};
  
  const schema = { body: Joi.object({ email: Joi.string().email().required() }) };
  const middleware = validate(schema);
  
  try {
    middleware(mockReq, mockRes, mockNext);
    throw new Error('Validation middleware did not throw error');
  } catch (error) {
    if (!(error instanceof ValidationError)) {
      throw new Error('Validation middleware did not throw ValidationError');
    }
    if (error.statusCode !== 400) {
      throw new Error('ValidationError should have statusCode 400');
    }
  }
});

// Test 21: Validation middleware calls next() on success
test('Validation middleware calls next() on valid data', () => {
  const mockReq = {
    body: { email: 'valid@example.com' },
    params: {},
    query: {},
  };
  const mockRes = {};
  let nextCalled = false;
  const mockNext = () => { nextCalled = true; };
  
  const schema = { body: Joi.object({ email: Joi.string().email().required() }) };
  const middleware = validate(schema);
  
  middleware(mockReq, mockRes, mockNext);
  
  if (!nextCalled) throw new Error('next() was not called on valid data');
});

// Test 22: Validation strips unknown fields
test('Validation strips unknown fields from request', () => {
  const mockReq = {
    body: { email: 'valid@example.com', unknownField: 'should be removed' },
    params: {},
    query: {},
  };
  const mockRes = {};
  const mockNext = () => {};
  
  const schema = { body: Joi.object({ email: Joi.string().email().required() }) };
  const middleware = validate(schema);
  
  middleware(mockReq, mockRes, mockNext);
  
  if (mockReq.body.unknownField) {
    throw new Error('Unknown field was not stripped from request');
  }
});

console.log('=' .repeat(50));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('🎉 All validation tests passed!');
  process.exit(0);
}
