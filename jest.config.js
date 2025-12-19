module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },

  // Transform ignore patterns for node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(buffer-equal-constant-time)/)'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'utils/**/*.js',
    'middlewares/**/*.js',
    'controller/**/*.js',
    'routes/**/*.js',
    'model/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/scripts/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Global teardown
  globalTeardown: '<rootDir>/tests/teardown.js',

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Force exit after tests
  forceExit: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html']
};
