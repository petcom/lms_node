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

  // Module name mapper for ESM modules
  moduleNameMapper: {
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js'
  },

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
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.spec.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Global teardown
  globalTeardown: '<rootDir>/tests/teardown.ts',

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
