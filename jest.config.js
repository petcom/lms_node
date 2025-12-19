module.exports = {
  // TypeScript preset
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',

  // Roots
  roots: ['<rootDir>'],

  // Test match patterns
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.js'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true
    }]
  },

  // Transform ignore patterns for node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(buffer-equal-constant-time)/)'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    '**/*.{ts,js}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/logs/**',
    '!**/tests/**',
    '!**/scripts/**',
    '!jest.config.js',
    '!ecosystem.config.js'
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
