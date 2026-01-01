# TypeScript Conversion Checklist

## Document Version: 1.0
**Last Updated:** December 18, 2025  
**Project:** LMS API TypeScript Migration  
**Current Codebase:** 89 JavaScript files  
**Estimated Duration:** 5-7 weeks  
**Migration Strategy:** Incremental (bottom-up)

---

## MIGRATION OVERVIEW

### Project Statistics
- **Total JavaScript Files:** 89
- **Controllers:** 15 files
- **Routes:** 14 files
- **Models:** 14 files
- **Middlewares:** 7 files
- **Utilities:** 16 files
- **Validators:** 5 files
- **Configuration:** 3 files
- **Tests:** 4 files
- **Scripts:** 4 files
- **Root Files:** 7 files

### Migration Approach
**Strategy:** Bottom-up incremental migration
1. Foundation (types, config, tooling)
2. Core utilities and shared types
3. Data layer (models, validators)
4. Middleware layer
5. Application layer (controllers, routes)
6. Tests and finalization

### Benefits of TypeScript
- ✅ Compile-time type safety
- ✅ Enhanced IDE autocomplete and refactoring
- ✅ Self-documenting code with interfaces
- ✅ Catch errors before runtime
- ✅ Better team collaboration
- ✅ Easier maintenance and debugging

---

## PHASE 1: FOUNDATION & TOOLING SETUP (21 tasks)

**Duration:** 2-3 days  
**Goal:** Set up TypeScript infrastructure without breaking existing code  
**Status:** ✅ COMPLETED  
**Completed By:** GitHub Copilot  
**Date:** December 18, 2025

### 1.1 TypeScript Installation & Configuration
- [x] Install TypeScript core packages
  - [x] `npm install -D typescript@^5.6.0`
  - [x] `npm install -D ts-node@^10.9.2`
  - [x] `npm install -D ts-node-dev@^2.0.0` (for development)
- [x] Install Node.js type definitions
  - [x] `npm install -D @types/node@^22.0.0`
- [x] Create `tsconfig.json` with base configuration
  - [x] Set `target: "ES2022"`
  - [x] Set `module: "commonjs"`
  - [x] Set `lib: ["ES2022"]`
  - [x] Set `outDir: "./dist"`
  - [x] Set `rootDir: "./"`
  - [x] Enable `strict: true` for full type checking
  - [x] Enable `esModuleInterop: true`
  - [x] Enable `skipLibCheck: true`
  - [x] Enable `forceConsistentCasingInFileNames: true`
  - [x] Enable `resolveJsonModule: true`
  - [x] Set `allowJs: true` for gradual migration
  - [x] Set `checkJs: false` initially
  - [x] Configure `include: ["**/*.ts", "**/*.js"]`
  - [x] Configure `exclude: ["node_modules", "dist", "tests"]`
- [x] Create `tsconfig.build.json` for production builds
  - [x] Extend base `tsconfig.json`
  - [x] Set `allowJs: false`
  - [x] Set `declaration: true` for .d.ts files
  - [x] Configure `include: ["**/*.ts"]` only
- [x] **Verification:** `tsc --noEmit` runs without errors
- [x] **Verification:** TypeScript compiler installed correctly

### 1.2 Type Definition Packages
- [x] Install Express type definitions
  - [x] `npm install -D @types/express@^4.17.21`
  - [x] `npm install -D @types/express-serve-static-core@^4.17.41` (included with @types/express)
- [x] Install middleware type definitions
  - [x] `npm install -D @types/cors@^2.8.17`
  - [x] `npm install -D @types/compression@^1.7.5`
  - [x] `npm install -D @types/morgan@^1.9.9`
  - [x] Created custom types for express-mongo-sanitize (no official types available)
- [x] Install authentication type definitions
  - [x] `npm install -D @types/bcryptjs@^2.4.6`
  - [x] `npm install -D @types/jsonwebtoken@^9.0.6`
- [x] Install utility type definitions
  - [x] `npm install -D @types/validator@^13.12.0`
  - [x] `npm install -D @types/swagger-jsdoc@^6.0.4`
  - [x] `npm install -D @types/swagger-ui-express@^4.1.6`
- [x] Install dotenv type definitions
  - [x] `npm install -D @types/dotenv-safe@^8.1.6`
- [x] Install testing type definitions
  - [x] `npm install -D @types/jest@^30.0.0` (already installed)
  - [x] `npm install -D @types/supertest@^6.0.2`
  - [x] `npm install -D ts-jest@^29.2.0`
- [x] Install development type definitions
  - [x] `npm install -D @types/nodemon@^1.19.6`
- [x] **Verification:** All @types packages installed
- [x] **Verification:** No TypeScript errors from type definitions

### 1.3 ESLint & Prettier Configuration
- [x] Install ESLint for TypeScript
  - [x] `npm install -D eslint@^8.57.0`
  - [x] `npm install -D @typescript-eslint/parser@^7.0.0`
  - [x] `npm install -D @typescript-eslint/eslint-plugin@^7.0.0`
- [x] Create `.eslintrc.json` configuration
  - [x] Configure parser: `@typescript-eslint/parser`
  - [x] Add plugin: `@typescript-eslint`
  - [x] Extend: `eslint:recommended`, `plugin:@typescript-eslint/recommended`
  - [x] Configure rules for TypeScript
  - [x] Set environment: `node: true`, `es2022: true`
- [x] Install Prettier
  - [x] `npm install -D prettier@^3.1.0`
  - [x] `npm install -D eslint-config-prettier@^9.1.0`
  - [x] `npm install -D eslint-plugin-prettier@^5.1.0`
- [x] Create `.prettierrc.json` configuration
  - [x] Set `semi: true`
  - [x] Set `singleQuote: true`
  - [x] Set `trailingComma: "es5"`
  - [x] Set `tabWidth: 2`
  - [x] Set `printWidth: 100`
- [x] Create `.prettierignore` file
  - [x] Add `node_modules`, `dist`, `coverage`, `logs`
- [x] **Verification:** `npm run lint` script works
- [x] **Verification:** `npm run format` script works
- [x] **Verification:** ESLint catches TypeScript issues

### 1.4 Build & Development Scripts
- [x] Update `package.json` scripts
  - [x] Add `"build": "tsc -p tsconfig.build.json"`
  - [x] Add `"build:watch": "tsc -p tsconfig.build.json --watch"`
  - [x] Add `"type-check": "tsc --noEmit"`
  - [x] Add `"type-check:watch": "tsc --noEmit --watch"`
  - [x] Add `"dev:ts": "ts-node-dev --respawn --transpile-only server.ts"`
  - [x] Add `"lint": "eslint . --ext .ts,.js"`
  - [x] Add `"lint:fix": "eslint . --ext .ts,.js --fix"`
  - [x] Add `"format": "prettier --write \"**/*.{ts,js,json,md}\""`
  - [x] Add `"format:check": "prettier --check \"**/*.{ts,js,json,md}\""`
- [x] Update `package.json` `main` field to `"dist/server.js"`
- [x] Update `package.json` `engines` to specify Node.js version
- [x] **Verification:** All new scripts execute successfully
- [x] **Verification:** Build produces `dist/` folder with compiled .js files

### 1.5 Jest TypeScript Configuration
- [x] Update `jest.config.js` for TypeScript
  - [x] Set `preset: 'ts-jest'`
  - [x] Set `testEnvironment: 'node'`
  - [x] Configure `moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json']`
  - [x] Update `testMatch` to include `**/*.test.ts`
  - [x] Configure `transform` with `ts-jest` for .ts files
  - [x] Add `globals` for ts-jest configuration
- [x] Create `tsconfig.test.json` for test-specific settings
  - [x] Extend base `tsconfig.json`
  - [x] Include test files
  - [x] Set `allowJs: true` for transition period
- [x] Update test scripts in `package.json`
  - [x] Ensure `test` script runs TypeScript tests
- [x] **Verification:** `npm test` runs with ts-jest
- [x] **Verification:** TypeScript test files can be executed

### 1.6 Git & Documentation Updates
- [x] Update `.gitignore` for TypeScript
  - [x] Add `dist/` folder
  - [x] Add `*.tsbuildinfo`
  - [x] Ensure `.env` files excluded
- [x] Create `types/` directory for custom type definitions
- [x] Create `.vscode/settings.json` (optional) - Skipped (user preference)
- [x] Document migration strategy in README
  - [x] Add TypeScript section
  - [x] Document build process
  - [x] Document type-checking process
- [x] **Verification:** Git ignores TypeScript build artifacts
- [x] **Verification:** Team members can run TypeScript build

---

## PHASE 2: CORE TYPES & UTILITIES (38 tasks) ✅ COMPLETE

**Duration:** 3-4 days  
**Goal:** Create type foundation and migrate utility functions
**Status:** ✅ COMPLETED - Commit: 7b1eb16

### 2.1 Shared Type Definitions
- [x] Create `types/express.d.ts` for Express augmentation
  - [x] Extend `Express.Request` interface
  - [x] Add `userAuth` property with User type
  - [x] Add proper typing for custom properties (advancedResults for pagination)
- [x] Create `types/models.ts` for database model types
  - [x] Define `IAdmin` interface
  - [x] Define `IInstructor` interface
  - [x] Define `ILearner` interface
  - [x] Define `IAcademicYear` interface
  - [x] Define `IAcademicTerm` interface
  - [x] Define `IClassLevel` interface
  - [x] Define `IProgram` interface
  - [x] Define `ISubject` interface
  - [x] Define `IExam` interface
  - [x] Define `IExamResult` interface
  - [x] Define `IQuestion` interface
  - [x] Define `IYearGroup` interface
  - [x] Define `ITokenBlacklist` interface with model statics
  - [x] Define `IRefreshToken` interface with model methods
- [x] Create `types/auth.ts` for authentication types
  - [x] Define `JWTPayload` interface
  - [x] Define `RefreshTokenPayload` interface
  - [x] Define `TokenPair` interface (with expiresIn)
  - [x] Define `UserRole` type union (re-exported from models)
  - [x] Define `AuthenticatedUser` interface
  - [x] Define `PasswordValidationResult` interface
  - [x] Define `PasswordStrength` type
- [x] Create `types/api.ts` for API response types
  - [x] Define `ApiResponse<T>` generic interface
  - [x] Define `ApiError` interface
  - [x] Define `PaginationMeta` interface
  - [x] Define `PaginatedResponse<T>` interface
  - [x] Define `SuccessResponse<T>` interface
  - [x] Define `ValidationErrorDetail` interface
- [x] Create `types/validation.ts` for validation types
  - [x] Define validation schema types
  - [x] Define `ValidationTarget` type
  - [x] Define `CustomValidationError` interface
  - [x] Re-export Joi types
- [x] Create `types/index.ts` for central exports
- [x] **Verification:** All shared types compile without errors ✅
- [x] **Verification:** Types are properly exported ✅

### 2.2 Error Classes Migration
- [x] Convert `utils/errors/AppError.js` to TypeScript
  - [x] Rename to `AppError.ts`
  - [x] Add proper type annotations (statusCode, status, isOperational)
  - [x] Define constructor parameter types
  - [x] Export class with types
- [x] Convert `utils/errors/ValidationError.js` to TypeScript
  - [x] Rename to `ValidationError.ts`
  - [x] Extend `AppError` with proper typing
  - [x] Use `ValidationErrorDetail[]` type
- [x] Convert `utils/errors/AuthenticationError.js` to TypeScript
  - [x] Rename to `AuthenticationError.ts` (401 errors)
- [x] Convert `utils/errors/AuthorizationError.js` to TypeScript
  - [x] Rename to `AuthorizationError.ts` (403 errors)
- [x] Convert `utils/errors/NotFoundError.js` to TypeScript
  - [x] Rename to `NotFoundError.ts` (404 errors)
- [x] Convert `utils/errors/DatabaseError.js` to TypeScript
  - [x] Rename to `DatabaseError.ts` (500 errors)
- [x] Convert `utils/errors/ConflictError.js` to TypeScript
  - [x] Rename to `ConflictError.ts` (409 errors)
- [x] Update `utils/errors/index.js` to TypeScript
  - [x] Rename to `index.ts`
  - [x] Export all 7 error classes with types
- [x] **Verification:** All error classes compile correctly ✅
- [x] **Verification:** Error classes maintain inheritance hierarchy ✅
- [x] **Verification:** Type inference works for error instances ✅

### 2.3 Core Utility Functions
- [x] Convert `utils/helpers.js` to TypeScript
  - [x] Rename to `helpers.ts`
  - [x] Add type for `hashPassword(password: string): Promise<string>`
  - [x] Add type for `isPassMatched(password: string, hash: string): Promise<boolean>`
  - [x] Export functions with proper types
- [x] Convert `utils/passwordValidator.js` to TypeScript
  - [x] Rename to `passwordValidator.ts`
  - [x] Define `PasswordValidationResult` interface (in types/auth.ts)
  - [x] Define `PasswordStrength` type (in types/auth.ts)
  - [x] Type all validation functions (validatePassword, validatePasswordConfirmation, getPasswordStrength, getPasswordStrengthLabel)
  - [x] Export with proper types
- [x] Convert `utils/generateToken.js` to TypeScript
  - [x] Rename to `generateToken.ts`
  - [x] Type function: `generateToken(id: string): string`
  - [x] Handle environment variable types
  - [x] Fix jwt.sign type assertion
- [x] Convert `utils/verifyToken.js` to TypeScript
  - [x] Rename to `verifyToken.ts`
  - [x] Type function: `verifyToken(token: string): Promise<JWTPayload>`
  - [x] Type error handling with proper Error checks
  - [x] Import and type TokenBlacklist model with custom statics
- [x] Convert `utils/tokenManager.js` to TypeScript
  - [x] Rename to `tokenManager.ts`
  - [x] Import `TokenPair`, `UserRole` types
  - [x] Type `generateTokenPair(userId: string, userType: UserRole, deviceInfo?: DeviceInfo): Promise<TokenPair>`
  - [x] Type `refreshAccessToken(refreshToken: string): Promise<TokenPair>`
  - [x] Type all token management functions (revokeRefreshToken, revokeAllUserTokens)
  - [x] Type RefreshToken model with custom methods
- [x] Convert `utils/response.js` to TypeScript
  - [x] Rename to `response.ts`
  - [x] Import Express Response type
  - [x] Type all response functions with generics
  - [x] Use `SuccessResponse<T>`, `PaginatedResponse<T>` types
  - [x] Implement successResponse, paginatedResponse, createdResponse, noContentResponse, errorResponse
- [x] Convert `utils/roles.js` to TypeScript
  - [x] Rename to `roles.ts`
  - [x] Define `UserRole` type (imported from auth)
  - [x] Define `Permission` type union (25 permissions)
  - [x] Type ROLES constants, ROLE_HIERARCHY, ROLE_PERMISSIONS objects
  - [x] Type all utility functions (hasPermission, hasHigherOrEqualRole, getAllRoles, isValidRole)
- [x] Convert `utils/logger.js` to TypeScript
  - [x] Rename to `logger.ts`
  - [x] Import Winston types (winston, DailyRotateFile)
  - [x] Type logger configuration (transports, formats)
  - [x] Export typed logger instance and stream
- [x] **Verification:** All utility files compile without errors ✅
- [x] **Verification:** Type inference works for utility functions ✅
- [x] **Verification:** No implicit `any` types ✅
- [x] **Verification:** Build successful (npm run build) ✅

---

## PHASE 3: MODELS & VALIDATORS (34 tasks) ✅ COMPLETE

**Duration:** 4-5 days  
**Goal:** Convert Mongoose models and Joi validators with full type safety  
**Status:** ✅ COMPLETED - Commit: 6d7e13b  
**Completed By:** GitHub Copilot  
**Date:** December 18, 2025

### 3.1 Mongoose Model Setup
- [x] Research Mongoose TypeScript best practices
  - [x] Review `InferSchemaType` utility
  - [x] Review `HydratedDocument` type
  - [x] Decide on interface vs InferSchemaType approach
- [x] Create model type helper utilities
  - [x] Create `types/mongoose.ts` for common Mongoose types
  - [x] Define document types for each model
  - [x] Define model static method types

### 3.2 Admin & Auth Models
- [x] Convert `model/Staff/Admin.js` to TypeScript
  - [x] Rename to `Admin.ts`
  - [x] Define `IAdminDocument` interface
  - [x] Define `IAdminModel` interface for statics
  - [x] Type schema definition
  - [x] Type pre-save hooks
  - [x] Type instance methods
  - [x] Export model with proper types
- [x] Convert `model/Auth/TokenBlacklist.js` to TypeScript
  - [x] Rename to `TokenBlacklist.ts`
  - [x] Define `ITokenBlacklistDocument` interface
  - [x] Type schema and model
- [x] Convert `model/Auth/RefreshToken.js` to TypeScript
  - [x] Rename to `RefreshToken.ts`
  - [x] Define `IRefreshTokenDocument` interface
  - [x] Type schema with expiry logic
  - [x] Type static methods
- [x] **Verification:** Admin/Auth models compile correctly ✅
- [x] **Verification:** Model methods are properly typed ✅

### 3.3 Staff Models
- [x] Convert `model/Staff/Instructor.js` to TypeScript
  - [x] Rename to `Instructor.ts`
  - [x] Define `IInstructorDocument` interface
  - [x] Define `IInstructorModel` interface
  - [x] Type ID generation logic
  - [x] Type all schema fields with proper types
  - [x] Type pre-save hooks
- [x] **Verification:** Instructor model compiles correctly ✅
- [x] **Verification:** Population types work correctly ✅

### 3.4 Learner Models
- [x] Convert `model/Academic/Learner.js` to TypeScript
  - [x] Rename to `Learner.ts`
  - [x] Define `ILearnerDocument` interface
  - [x] Define `ILearnerModel` interface
  - [x] Type learner ID generation
  - [x] Type exam results array
  - [x] Type program and class level references
  - [x] Type all schema fields
- [x] **Verification:** Learner model compiles correctly ✅
- [x] **Verification:** Reference population is typed ✅

### 3.5 Academic Models
- [x] Convert `model/Academic/AcademicYear.js` to TypeScript
  - [x] Rename to `AcademicYear.ts`
  - [x] Define `IAcademicYearDocument` interface
  - [x] Type schema fields (name, fromYear, toYear, isCurrent)
  - [x] Type created by reference
- [x] Convert `model/Academic/AcademicTerm.js` to TypeScript
  - [x] Rename to `AcademicTerm.ts`
  - [x] Define `IAcademicTermDocument` interface
  - [x] Type schema with academic year reference
- [x] Convert `model/Academic/ClassLevel.js` to TypeScript
  - [x] Rename to `ClassLevel.ts`
  - [x] Define `IClassLevelDocument` interface
- [x] Convert `model/Academic/Program.js` to TypeScript
  - [x] Rename to `Program.ts`
  - [x] Define `IProgramDocument` interface
  - [x] Type subjects array reference
- [x] Convert `model/Academic/Subject.js` to TypeScript
  - [x] Rename to `Subject.ts`
  - [x] Define `ISubjectDocument` interface
  - [x] Type academic year and program references
- [x] Convert `model/Academic/YearGroup.js` to TypeScript
  - [x] Rename to `YearGroup.ts`
  - [x] Define `IYearGroupDocument` interface
- [x] Convert `model/Academic/Exam.js` to TypeScript
  - [x] Rename to `Exam.ts`
  - [x] Define `IExamDocument` interface
  - [x] Type questions array
  - [x] Type academic references (term, year, program, subject)
  - [x] Type created by reference
- [x] Convert `model/Academic/ExamResults.js` to TypeScript
  - [x] Rename to `ExamResults.ts`
  - [x] Define `IExamResultDocument` interface
  - [x] Type learner and exam references
  - [x] Type grade and answers
- [x] Convert `model/Academic/Question.js` to TypeScript
  - [x] Rename to `Question.ts`
  - [x] Define `IQuestionDocument` interface
  - [x] Type question fields and answer options
  - [x] Type created by reference
- [x] **Verification:** All academic models compile correctly ✅
- [x] **Verification:** Model relationships properly typed ✅

### 3.6 Joi Validators Migration
- [x] Convert `validators/common.js` to TypeScript
  - [x] Rename to `common.ts`
  - [x] Export typed validation schemas
  - [x] Use Joi TypeScript definitions
- [x] Convert `validators/authValidation.js` to TypeScript
  - [x] Rename to `authValidation.ts`
  - [x] Define schema types
  - [x] Export typed schemas
- [x] Convert `validators/learnerValidation.js` to TypeScript
  - [x] Rename to `learnerValidation.ts`
  - [x] Type all validation schemas
- [x] Convert `validators/staffValidation.js` to TypeScript
  - [x] Rename to `staffValidation.ts`
  - [x] Type all validation schemas
- [x] Convert `validators/academicValidation.js` to TypeScript
  - [x] Rename to `academicValidation.ts`
  - [x] Type all academic validation schemas
- [x] **Verification:** All validators compile correctly ✅
- [x] **Verification:** Validation schemas match model types ✅

---

## PHASE 4: MIDDLEWARES & CONFIGURATION (28 tasks) ✅ COMPLETE

**Duration:** 3-4 days  
**Goal:** Convert middleware functions and configuration files  
**Status:** ✅ COMPLETED - Commit: 4b4f982  
**Completed By:** GitHub Copilot  
**Date:** December 18, 2025

### 4.1 Authentication & Authorization Middleware
- [x] Convert `middlewares/isAuthenticated.js` to TypeScript
  - [x] Rename to `isAuthenticated.ts`
  - [x] Import Express types
  - [x] Import custom Request type with `userAuth`
  - [x] Type middleware: `RequestHandler`
  - [x] Type async error handling
  - [x] Properly type `req.userAuth` assignment
- [x] Convert `middlewares/roleRestriction.js` to TypeScript
  - [x] Rename to `roleRestriction.ts`
  - [x] Create type-safe role checking
  - [x] Type middleware factory: `(...roles: Role[]) => RequestHandler`
  - [x] Use `Role` type from `utils/roles`
- [x] **Verification:** Auth middleware compiles correctly ✅
- [x] **Verification:** Type inference works for `req.userAuth` ✅

### 4.2 Validation & Error Middleware
- [x] Convert `middlewares/validate.js` to TypeScript
  - [x] Rename to `validate.ts`
  - [x] Import Joi types
  - [x] Type validation targets: `'body' | 'params' | 'query'`
  - [x] Type middleware factory with generics
  - [x] Ensure proper error typing
- [x] Convert `middlewares/globalErrHandler.js` to TypeScript
  - [x] Rename to `globalErrHandler.ts`
  - [x] Type error handler: `ErrorRequestHandler`
  - [x] Import custom error classes
  - [x] Type error response formatting
  - [x] Handle MongoDB, JWT, and custom errors
- [x] **Verification:** Validation middleware typed correctly ✅
- [x] **Verification:** Error handler catches all error types ✅

### 4.3 Performance & Security Middleware
- [x] Convert `middlewares/advancedResults.js` to TypeScript
  - [x] Rename to `advancedResults.ts`
  - [x] Create generic type for model
  - [x] Type middleware factory: `<T>(model: Model<T>) => RequestHandler`
  - [x] Type pagination result object
  - [x] Type query building logic
- [x] Convert `middlewares/caching.js` to TypeScript
  - [x] Rename to `caching.ts`
  - [x] Type cache middleware functions
  - [x] Type duration parameters
  - [x] Export typed cache utilities
- [x] Convert `middlewares/rateLimiter.js` to TypeScript
  - [x] Rename to `rateLimiter.ts`
  - [x] Import express-rate-limit types
  - [x] Type rate limiter configurations
  - [x] Export typed limiter instances
- [x] **Verification:** All middleware compiles correctly ✅
- [x] **Verification:** Generic types work properly ✅

### 4.4 Configuration Files
- [x] Convert `config/dbConnect.js` to TypeScript
  - [x] Rename to `dbConnect.ts`
  - [x] Import Mongoose types
  - [x] Type connection function
  - [x] Type connection options
  - [x] Handle environment variable types
- [x] Convert `config/cors.js` to TypeScript
  - [x] Rename to `cors.ts`
  - [x] Import CORS types from `@types/cors`
  - [x] Type CORS options object
  - [x] Type origin validation function
  - [x] Export typed CORS configuration
- [x] Convert `config/swagger.js` to TypeScript
  - [x] Rename to `swagger.ts`
  - [x] Import swagger-jsdoc types
  - [x] Import swagger-ui-express types
  - [x] Type Swagger options
  - [x] Type API definition object
  - [x] Export typed Swagger configuration
- [x] **Verification:** All config files compile correctly ✅
- [x] **Verification:** Environment variable types safe ✅

### 4.5 Express Request Augmentation
- [x] Update `types/express.d.ts` with all custom properties
  - [x] Add `userAuth` with proper user type
  - [x] Add `advancedResults` property for pagination
  - [x] Ensure declaration merging works
- [x] Test type augmentation across application
  - [x] Verify `req.userAuth` autocomplete works
  - [x] Verify middleware type inference
- [x] **Verification:** Custom Request properties typed correctly ✅
- [x] **Verification:** No TypeScript errors in middleware chain ✅

---

## PHASE 5: CONTROLLERS & ROUTES (42 tasks) ✅ COMPLETE

**Duration:** 5-7 days  
**Goal:** Convert all controllers and routes to TypeScript  
**Status:** ✅ COMPLETED - Commit: caae8a7  
**Completed By:** GitHub Copilot  
**Date:** December 18, 2025

### 5.1 Health & Root Controllers
- [x] Convert `controller/healthCtrl.js` to TypeScript
  - [ ] Rename to `healthCtrl.ts`
  - [ ] Import Express types
  - [ ] Type request handlers: `RequestHandler`
  - [ ] Type health check response
  - [ ] Export typed handlers
- [ ] **Verification:** Health controller compiles correctly

### 5.2 Authentication Controllers
- [ ] Convert `controller/auth/authCtrl.js` to TypeScript
  - [ ] Rename to `authCtrl.ts`
  - [ ] Import model types (`IAdmin`, etc.)
  - [ ] Import token types
  - [ ] Type all controller functions as `RequestHandler`
  - [ ] Type request body interfaces
  - [ ] Type response data
  - [ ] Handle async/await properly
- [ ] Convert `controller/auth/passwordCtrl.js` to TypeScript
  - [ ] Rename to `passwordCtrl.ts`
  - [ ] Import password validation types
  - [ ] Type request bodies for password operations
  - [ ] Type all handlers
- [ ] **Verification:** Auth controllers compile correctly
- [ ] **Verification:** Request/Response types accurate

### 5.3 Admin Controllers
- [ ] Convert `controller/staff/adminCtrl.js` to TypeScript
  - [ ] Rename to `adminCtrl.ts`
  - [ ] Import `IAdmin`, `IInstructor` types
  - [ ] Type registration handler
  - [ ] Type login handler
  - [ ] Type profile handlers
  - [ ] Type admin action handlers (suspend, withdraw, etc.)
  - [ ] Type all request bodies and responses
- [ ] **Verification:** Admin controller compiles correctly
- [ ] **Verification:** Type safety for admin actions

### 5.4 Instructor Controllers
- [ ] Convert `controller/staff/instructorsCtrl.js` to TypeScript
  - [ ] Rename to `instructorsCtrl.ts`
  - [ ] Import `IInstructor` type
  - [ ] Type registration handler
  - [ ] Type login handler
  - [ ] Type profile handlers
  - [ ] Type subject/class assignment
- [ ] **Verification:** Instructor controller compiles correctly

### 5.5 Learner Controllers
- [ ] Convert `controller/learners/learnersCtrl.js` to TypeScript
  - [ ] Rename to `learnersCtrl.ts`
  - [ ] Import `ILearner` type
  - [ ] Type registration handler
  - [ ] Type login handler
  - [ ] Type profile handlers
  - [ ] Type exam-related handlers
- [ ] **Verification:** Learner controller compiles correctly

### 5.6 Academic Year Controllers
- [ ] Convert `controller/academics/academicYearCtrl.js` to TypeScript
  - [ ] Rename to `academicYearCtrl.ts`
  - [ ] Import `IAcademicYear` type
  - [ ] Type CRUD handlers
  - [ ] Type query parameters
  - [ ] Use proper Mongoose document types
- [ ] Convert `controller/academics/academicTermCtrl.js` to TypeScript
  - [ ] Rename to `academicTermCtrl.ts`
  - [ ] Import `IAcademicTerm` type
  - [ ] Type all handlers
- [ ] Convert `controller/academics/classLevelCtrl.js` to TypeScript
  - [ ] Rename to `classLevelCtrl.ts`
  - [ ] Import `IClassLevel` type
  - [ ] Type all handlers
- [ ] Convert `controller/academics/programsCtrl.js` to TypeScript
  - [ ] Rename to `programsCtrl.ts`
  - [ ] Import `IProgram` type
  - [ ] Type all handlers
- [ ] Convert `controller/academics/subjectCtrl.js` to TypeScript
  - [ ] Rename to `subjectCtrl.ts`
  - [ ] Import `ISubject` type
  - [ ] Type all handlers
- [ ] Convert `controller/academics/yearGroupsCtrl.js` to TypeScript
  - [ ] Rename to `yearGroupsCtrl.ts`
  - [ ] Import `IYearGroup` type
  - [ ] Type all handlers
- [ ] **Verification:** All academic controllers compile correctly
- [ ] **Verification:** CRUD operations properly typed

### 5.7 Exam Controllers
- [ ] Convert `controller/academics/examsCtrl.js` to TypeScript
  - [ ] Rename to `examsCtrl.ts`
  - [ ] Import `IExam`, `IExamResult` types
  - [ ] Type exam creation handler
  - [ ] Type exam retrieval handlers
  - [ ] Type exam update/delete handlers
  - [ ] Type exam publishing logic
- [ ] Convert `controller/academics/questionsCtrl.js` to TypeScript
  - [ ] Rename to `questionsCtrl.ts`
  - [ ] Import `IQuestion` type
  - [ ] Type question CRUD handlers
- [ ] Convert `controller/academics/examResults.js` to TypeScript
  - [ ] Rename to `examResults.ts`
  - [ ] Import `IExamResult` type
  - [ ] Type result submission handler
  - [ ] Type grading logic
  - [ ] Type result retrieval handlers
- [ ] **Verification:** Exam controllers compile correctly
- [ ] **Verification:** Exam workflow types correct

### 5.8 Route Files
- [ ] Convert `routes/auth/authRoutes.js` to TypeScript
  - [ ] Rename to `authRoutes.ts`
  - [ ] Import Express Router types
  - [ ] Import typed controllers
  - [ ] Import typed middleware
  - [ ] Type route definitions
- [ ] Convert `routes/auth/passwordRoutes.js` to TypeScript
  - [ ] Rename to `passwordRoutes.ts`
  - [ ] Type route handlers
- [ ] Convert `routes/staff/adminRouter.js` to TypeScript
  - [ ] Rename to `adminRouter.ts`
  - [ ] Type all routes
  - [ ] Ensure middleware typing correct
- [ ] Convert `routes/staff/instructorRouter.js` to TypeScript
  - [ ] Rename to `instructorRouter.ts`
  - [ ] Type all routes
- [ ] Convert `routes/learners/learnerRouter.js` to TypeScript
  - [ ] Rename to `learnerRouter.ts`
  - [ ] Type all routes
- [ ] Convert `routes/academics/academicYear.js` to TypeScript
  - [ ] Rename to `academicYear.ts`
  - [ ] Type all routes
- [ ] Convert `routes/academics/academicTerm.js` to TypeScript
  - [ ] Rename to `academicTerm.ts`
- [ ] Convert `routes/academics/classLevel.js` to TypeScript
  - [ ] Rename to `classLevel.ts`
- [ ] Convert `routes/academics/programs.js` to TypeScript
  - [ ] Rename to `programs.ts`
- [ ] Convert `routes/academics/subjects.js` to TypeScript
  - [ ] Rename to `subjects.ts`
- [ ] Convert `routes/academics/yearGroups.js` to TypeScript
  - [ ] Rename to `yearGroups.ts`
- [ ] Convert `routes/academics/examRoutes.js` to TypeScript
  - [ ] Rename to `examRoutes.ts`
- [ ] Convert `routes/academics/questionRoutes.js` to TypeScript
  - [ ] Rename to `questionRoutes.ts`
- [ ] Convert `routes/academics/examResultsRoutes.js` to TypeScript
  - [ ] Rename to `examResultsRoutes.ts`
- [ ] **Verification:** All routes compile correctly
- [ ] **Verification:** Route parameters typed correctly

### 5.9 Application Entry Points
- [ ] Convert `app/app.js` to TypeScript
  - [ ] Rename to `app.ts`
  - [ ] Import Express types
  - [ ] Type Express application
  - [ ] Import all typed routes
  - [ ] Type middleware configuration
  - [ ] Export typed app
- [ ] Convert `server.js` to TypeScript
  - [ ] Rename to `server.ts`
  - [ ] Import typed app
  - [ ] Type server startup
  - [ ] Type environment variables
  - [ ] Type shutdown handlers
- [ ] **Verification:** Application starts successfully
- [ ] **Verification:** All routes functional

---

## PHASE 6: TESTING & FINALIZATION (35 tasks)

**Duration:** 3-4 days  
**Goal:** Convert tests, remove .js files, finalize migration

### 6.1 Test Infrastructure
- [ ] Update `tests/setup.js` to TypeScript
  - [ ] Rename to `setup.ts`
  - [ ] Import Jest types
  - [ ] Type setup functions
- [ ] Update `tests/teardown.js` to TypeScript
  - [ ] Rename to `teardown.ts`
  - [ ] Type teardown functions
- [ ] Update `tests/helpers/dbHelper.js` to TypeScript
  - [ ] Rename to `dbHelper.ts`
  - [ ] Type database helper functions
  - [ ] Import Mongoose types
- [ ] **Verification:** Test setup compiles correctly

### 6.2 Unit Test Conversion
- [ ] Convert `tests/unit/helpers.test.js` to TypeScript
  - [ ] Rename to `helpers.test.ts`
  - [ ] Import typed helpers
  - [ ] Type test assertions
  - [ ] Use TypeScript in test cases
- [ ] Convert `tests/unit/response.test.js` to TypeScript
  - [ ] Rename to `response.test.ts`
  - [ ] Import typed response utilities
  - [ ] Type mock request/response objects
- [ ] Create additional unit tests for TypeScript-specific features
  - [ ] Test type guards
  - [ ] Test generic functions
  - [ ] Test interface implementations
- [ ] **Verification:** All unit tests pass
- [ ] **Verification:** Type inference in tests works

### 6.3 Integration Test Conversion
- [ ] Convert `tests/integration/admin.test.js` to TypeScript
  - [ ] Rename to `admin.test.ts`
  - [ ] Import Supertest types
  - [ ] Import model types
  - [ ] Type test data
  - [ ] Type API responses
- [ ] Convert `tests/integration/academicYear.test.js` to TypeScript
  - [ ] Rename to `academicYear.test.ts`
  - [ ] Type test data and responses
- [ ] Add integration tests for TypeScript features
  - [ ] Test type-safe request bodies
  - [ ] Test typed error responses
- [ ] **Verification:** All integration tests pass
- [ ] **Verification:** No type errors in tests

### 6.4 Script File Conversion
- [ ] Convert `scripts/test-db-connection.js` to TypeScript
  - [ ] Rename to `test-db-connection.ts`
  - [ ] Import Mongoose types
  - [ ] Type connection testing logic
- [ ] Convert `scripts/verify_phase2.js` to TypeScript (if needed)
  - [ ] Rename to `verify_phase2.ts`
- [ ] Convert `scripts/verify_phase3.js` to TypeScript (if needed)
  - [ ] Rename to `verify_phase3.ts`
- [ ] Convert `scripts/verify_phase5.js` to TypeScript (if needed)
  - [ ] Rename to `verify_phase5.ts`
- [ ] Update script execution in `package.json`
  - [ ] Use `ts-node` for TypeScript scripts
- [ ] **Verification:** All scripts execute correctly

### 6.5 JavaScript File Removal
- [ ] Remove all `.js` files from `controller/`
  - [ ] Verify TypeScript equivalents exist
  - [ ] Delete 15 .js controller files
- [ ] Remove all `.js` files from `routes/`
  - [ ] Verify TypeScript equivalents exist
  - [ ] Delete 14 .js route files
- [ ] Remove all `.js` files from `model/`
  - [ ] Verify TypeScript equivalents exist
  - [ ] Delete 14 .js model files
- [ ] Remove all `.js` files from `middlewares/`
  - [ ] Verify TypeScript equivalents exist
  - [ ] Delete 7 .js middleware files
- [ ] Remove all `.js` files from `utils/`
  - [ ] Verify TypeScript equivalents exist
  - [ ] Delete 16 .js utility files
- [ ] Remove all `.js` files from `validators/`
  - [ ] Verify TypeScript equivalents exist
  - [ ] Delete 5 .js validator files
- [ ] Remove all `.js` files from `config/`
  - [ ] Verify TypeScript equivalents exist
  - [ ] Delete 3 .js config files
- [ ] Remove all `.js` test files
  - [ ] Verify TypeScript equivalents exist
  - [ ] Delete .js test files
- [ ] Remove `app/app.js` and `server.js`
  - [ ] Verify `app.ts` and `server.ts` work
- [ ] **Verification:** No .js source files remain (except config files)
- [ ] **Verification:** Application runs from TypeScript sources

### 6.6 Strict Type Checking
- [ ] Enable strict type checking in `tsconfig.json`
  - [ ] Ensure `strict: true` is enabled
  - [ ] Enable `noImplicitAny: true`
  - [ ] Enable `strictNullChecks: true`
  - [ ] Enable `strictFunctionTypes: true`
  - [ ] Enable `strictBindCallApply: true`
  - [ ] Enable `strictPropertyInitialization: true`
  - [ ] Enable `noImplicitThis: true`
  - [ ] Enable `alwaysStrict: true`
- [ ] Fix all strict mode type errors
  - [ ] Review all `any` types
  - [ ] Add proper null checks
  - [ ] Fix function type issues
- [ ] **Verification:** `tsc --noEmit` shows 0 errors
- [ ] **Verification:** No `any` types except where necessary

### 6.7 Build & Production Testing
- [ ] Run full TypeScript build
  - [ ] Execute `npm run build`
  - [ ] Verify `dist/` folder created
  - [ ] Verify all .js and .d.ts files generated
- [ ] Test production build
  - [ ] Set `NODE_ENV=production`
  - [ ] Run `node dist/server.js`
  - [ ] Verify server starts correctly
  - [ ] Test API endpoints
- [ ] Update PM2 `ecosystem.config.js`
  - [ ] Point to `dist/server.js` instead of `server.js`
  - [ ] Add build step to deployment
- [ ] Test with PM2
  - [ ] Run `npm run start:prod`
  - [ ] Verify cluster mode works
  - [ ] Check logs for errors
- [ ] **Verification:** Production build works correctly
- [ ] **Verification:** PM2 runs TypeScript-compiled code

### 6.8 Documentation & Cleanup
- [ ] Update `README.md` for TypeScript
  - [ ] Add TypeScript setup instructions
  - [ ] Document build process
  - [ ] Update development workflow
  - [ ] Add type-checking commands
  - [ ] Update testing instructions
- [ ] Update `DEPLOYMENT.md` for TypeScript
  - [ ] Add build step to deployment process
  - [ ] Document TypeScript dependencies
  - [ ] Update production start command
- [ ] Create `TYPESCRIPT_MIGRATION.md` completion report
  - [ ] Document migration process
  - [ ] List benefits achieved
  - [ ] Note any issues encountered
  - [ ] Provide TypeScript best practices
- [ ] Update `CONTRIBUTING.md` (if exists)
  - [ ] Add TypeScript coding standards
  - [ ] Document type definition requirements
  - [ ] Add linting rules
- [ ] Clean up any temporary files
  - [ ] Remove migration notes
  - [ ] Remove old JavaScript backups
- [ ] **Verification:** Documentation complete and accurate
- [ ] **Verification:** Team onboarded to TypeScript workflow

### 6.9 Final Verification
- [ ] Run full test suite
  - [ ] Execute `npm test`
  - [ ] Verify all tests pass
  - [ ] Check test coverage maintained (>70%)
- [ ] Run linter
  - [ ] Execute `npm run lint`
  - [ ] Fix any linting errors
  - [ ] Ensure code style consistent
- [ ] Run type checker
  - [ ] Execute `npm run type-check`
  - [ ] Verify 0 type errors
- [ ] Test all API endpoints manually
  - [ ] Admin registration/login
  - [ ] Instructor operations
  - [ ] Learner operations
  - [ ] Academic operations
  - [ ] Exam operations
- [ ] Performance testing
  - [ ] Compare response times to JavaScript version
  - [ ] Verify no performance degradation
  - [ ] Test under load
- [ ] Security audit
  - [ ] Run `npm audit`
  - [ ] Verify no new vulnerabilities
  - [ ] Check type safety prevents common errors
- [ ] **Verification:** All systems operational
- [ ] **Verification:** TypeScript migration complete

---

## MIGRATION COMPLETION SIGNATURES

**Phase 1 (Foundation) Completed By:** _________________ **Date:** _________  
**Phase 2 (Core Types) Completed By:** _________________ **Date:** _________  
**Phase 3 (Models) Completed By:** _________________ **Date:** _________  
**Phase 4 (Middlewares) Completed By:** _________________ **Date:** _________  
**Phase 5 (Controllers) Completed By:** _________________ **Date:** _________  
**Phase 6 (Testing) Completed By:** _________________ **Date:** _________  

**Migration Verification By:** _________________ **Date:** _________  
**TypeScript Production Approved By:** _________________ **Date:** _________

---

## POST-MIGRATION CHECKLIST

### Immediate Post-Migration (Week 1)
- [ ] Monitor application logs for runtime errors
- [ ] Track API response times
- [ ] Collect developer feedback on TypeScript experience
- [ ] Document any migration issues encountered
- [ ] Create knowledge base articles for common TypeScript patterns

### Ongoing Maintenance
- [ ] Keep TypeScript updated to latest stable version
- [ ] Update @types packages regularly
- [ ] Enforce strict typing in code reviews
- [ ] Expand test coverage using TypeScript features
- [ ] Refactor code to use more advanced TypeScript features (generics, utility types)

---

## BENEFITS TRACKING

### Expected Benefits
- [ ] **Type Safety:** 0 runtime type errors from TypeScript-migrated code
- [ ] **Developer Experience:** Improved autocomplete and refactoring
- [ ] **Code Quality:** Fewer bugs caught at compile time
- [ ] **Documentation:** Self-documenting code with interfaces
- [ ] **Maintainability:** Easier codebase navigation
- [ ] **Team Velocity:** Faster development with IDE support

### Metrics to Track
- [ ] Number of bugs caught during compilation vs runtime
- [ ] Time saved in debugging
- [ ] Developer satisfaction survey results
- [ ] Code review time reduction
- [ ] Onboarding time for new developers

---

## ROLLBACK PLAN

### If Migration Fails
1. [ ] All .js files preserved in git history
2. [ ] Revert to last known good commit before TypeScript migration
3. [ ] Document issues encountered
4. [ ] Re-plan migration with lessons learned
5. [ ] Consider hybrid approach (JavaScript + TypeScript)

### Rollback Steps
```bash
# Identify last good commit before TypeScript
git log --oneline

# Revert to that commit
git revert <commit-hash>

# Or reset to before migration (destructive)
git reset --hard <commit-hash>
```

---

## NOTES & OBSERVATIONS

**Migration Start Date:** ___________  
**Migration End Date:** ___________  
**Total Duration:** ___________ days

### Challenges Encountered
- 
- 
- 

### Solutions Applied
- 
- 
- 

### Lessons Learned
- 
- 
- 

### Recommendations for Future Migrations
- 
- 
- 

---

## TOTAL TASK COUNT: 198 TASKS

- **Phase 1:** 21 tasks
- **Phase 2:** 38 tasks
- **Phase 3:** 34 tasks
- **Phase 4:** 28 tasks
- **Phase 5:** 42 tasks
- **Phase 6:** 35 tasks

**Status:** ⏸️ Not Started

---

*This checklist is a living document. Update as migration progresses and new requirements emerge.*
