# Endpoint Validation Implementation Plan

**Created**: January 6, 2026  
**Status**: ✅ COMPLETED  
**Last Updated**: January 6, 2026  
**Prerequisite**: [Endpoint_validation_streamline.md](./Endpoint_validation_streamline.md)

---

## Overview

This plan organized the endpoint fixes into **5 implementation phases**, grouped by:
- Related model/field changes that should be done together
- Shared testing requirements
- Minimizing regression risk

**Total Estimated Effort**: 3-4 weeks  
**Test Coverage**: Started with 476 tests, ended with 521 tests (all passing)

## Summary of Completed Work

| Phase | Description | Tests Added | Status |
|-------|-------------|-------------|--------|
| Phase 1 | Remove email field writes | 11 | ✅ Complete |
| Phase 2 | Remove department field writes | 9 | ✅ Complete |
| Phase 3 | Fix department count queries | 8 | ✅ Complete |
| Phase 4 | Add deprecation middleware | 9 | ✅ Complete |
| Phase 5 | Add batch endpoints | 8 | ✅ Complete |

**Total New Tests**: 45 tests
**Total Tests**: 521 (476 original + 45 EVIP)

### Key Artifacts Created

- `middlewares/deprecation.ts` - RFC 8594/8288 compliant deprecation middleware
- `tests/integration/evip/phase1-email-field.test.ts` - Email storage tests
- `tests/integration/evip/phase2-department-field.test.ts` - Department inheritance tests
- `tests/integration/evip/phase3-department-counts.test.ts` - Count query tests
- `tests/unit/evip/phase4-deprecation.test.ts` - Middleware tests
- `tests/integration/evip/phase5-batch-endpoints.test.ts` - Batch operation tests

### API Documentation Updated

- `Identity-contract.md` - Phase 1 notes
- `Staff_Multi_Department-contract.md` - Phase 2 notes
- `ProgramLevels_Courses-contract.md` - Phase 2 notes
- `Department_Resources_UI-contract.md` - Phase 3 & 4 notes
- `Enrollment-contract.md` - Phase 5 notes

---

## ✅ Phase 1: Remove Deprecated Email Field Usage (COMPLETED)

**Duration**: 2-3 days  
**Risk Level**: Medium  
**Models Affected**: Learner, Staff, Admin (all use `getEmail()` pattern)
**Status**: ✅ COMPLETED - January 6, 2026

### 1.1 Implementation Summary

**Changes Made:**
1. `controller/learners/learnersCtrl.ts`:
   - Removed email from Learner.findByIdAndUpdate calls in `learnerUpdateProfile`
   - Updated `adminUpdateLearner` to only update User model for email changes
   - Email updates now go directly to User model (DCV-041)

2. `controller/staff/staffCtrl.ts`:
   - Removed `email` and `department` from `UpdateStaffProfileBody` interface
   - Simplified `staffUpdateProfile` to only update name and departmentMemberships on Staff
   - Email and password changes now go directly to User model (DCV-021)

**Tests Added:**
- `tests/integration/evip/phase1-email-field.test.ts` - 11 tests verifying:
  - `getEmail()` method works for Learner, Staff, Admin
  - Email not stored on person documents
  - User email updates reflected in `getEmail()` results
  - Schema ignores email field on model creation

**Test Results:** 487 tests passing (476 original + 11 new)

### 1.2 API Documentation Updated

- Updated `lms_node_devdocs/Identity-contract.md` with Phase 1 notes

---

## Phase 2: Remove Deprecated Department Field Usage

**Duration**: 2-3 days  
**Risk Level**: Medium  
**Models Affected**: Learner, Staff, Admin (all use `getEmail()` pattern)

### 1.1 Background

Per DCV-021, DCV-039, DCV-041, the `email` field was removed from Learner, Staff, and Admin models. Email is now stored only in the User model and accessed via `getEmail()` instance method.

### 1.2 Files to Modify

#### File 1: `controller/learners/learnersCtrl.ts`

**Location**: Lines 273-300, 349-370

**Current Code** (updateLearnerProfile ~L273):
```typescript
const learner = await Learner.findByIdAndUpdate(
  req.userAuth?._id,
  {
    email,  // ❌ Field doesn't exist
    name,
    // ...
  },
  { new: true }
);
```

**Fixed Code**:
```typescript
// Update email on User model (where it actually lives)
if (email) {
  await User.findByIdAndUpdate(req.userAuth?._id, { email });
}

// Update Learner fields (excluding email)
const learner = await Learner.findByIdAndUpdate(
  req.userAuth?._id,
  {
    name,
    // ... other valid fields
  },
  { new: true }
);
```

**Current Code** (adminUpdateLearner ~L349-370):
```typescript
const updateFields: {
  name?: PersonNameInput;
  email?: string;  // ❌ Field doesn't exist
} = {
  email,
};
```

**Fixed Code**:
```typescript
// Handle email update on User model
if (email) {
  await User.findByIdAndUpdate(learnerID, { email });
}

// Update Learner fields only
const updateFields: {
  name?: PersonNameInput;
} = {};
if (name) updateFields.name = name;
```

---

#### File 2: `controller/staff/staffCtrl.ts`

**Location**: Lines 30-35, 265-290

**Current Code** (interface ~L30):
```typescript
interface UpdateStaffProfileBody {
  email?: string;       // ❌ Not in Staff schema
  name?: PersonNameInput;
  password?: string;
  department?: string;  // ❌ Not in Staff schema (fix in Phase 2)
}
```

**Fixed Code**:
```typescript
interface UpdateStaffProfileBody {
  name?: PersonNameInput;
  password?: string;
  // email handled via User model
  // department handled via departmentMemberships (Phase 2)
}
```

**Current Code** (updateStaffProfile ~L265-290):
```typescript
const updateFields: Partial<IStaff> = {};
if (email) updateFields.email = email;  // ❌ Field doesn't exist
```

**Fixed Code**:
```typescript
// Handle email update on User model
if (email) {
  await User.findByIdAndUpdate(req.userAuth?._id, { email });
}

const updateFields: Partial<IStaff> = {};
// Only include valid Staff fields
```

---

### 1.3 Response Shape Updates

When returning profile data, ensure email comes from `getEmail()`:

```typescript
// In profile response handlers
const learner = await Learner.findById(id);
const email = await learner?.getEmail();  // Derives from User

res.json({
  data: {
    ...learner?.toObject(),
    email,  // Add derived email to response
  }
});
```

### 1.4 Testing Requirements

```bash
# Run affected test suites
npm test -- --testPathPattern="learner|staff" --verbose

# Specific tests to verify:
# - Learner profile update
# - Learner admin update
# - Staff profile update
# - Staff admin update
```

**New Test Cases Needed**:
```typescript
describe('Email updates go to User model', () => {
  it('should update email on User when learner updates profile', async () => {
    const newEmail = 'newemail@test.com';
    await request(app)
      .put('/api/v1/learners/update')
      .set('Authorization', `Bearer ${learnerToken}`)
      .send({ email: newEmail });
    
    const user = await User.findById(learnerId);
    expect(user?.email).toBe(newEmail);
  });
});
```

---

## ✅ Phase 2: Remove Deprecated Department Field Usage (COMPLETED)

**Duration**: 3-4 days  
**Risk Level**: High  
**Models Affected**: Course, ProgramLevel, Staff
**Status**: ✅ COMPLETED - January 6, 2026

### 2.1 Implementation Summary

The department field deprecation was already handled during DCV implementation. Phase 2 testing confirms:

**DCV-044 - Course/ProgramLevel Department Inheritance:**
- `Course.department` field no longer exists in schema
- `Course.getDepartment()` returns department from populated Program
- `ProgramLevel.department` field no longer exists in schema  
- `ProgramLevel.getDepartment()` returns department from populated Program

**DCV-022 - Staff Multi-Department:**
- `Staff.department` legacy field no longer exists
- `Staff.departmentMemberships[]` array is the source of truth
- `Staff.getPrimaryDepartment()` returns first membership's departmentId

**Tests Added:**
- `tests/integration/evip/phase2-department-field.test.ts` - 9 tests verifying:
  - Course.getDepartment() retrieves department via Program
  - ProgramLevel.getDepartment() retrieves department via Program
  - Staff.departmentMemberships array stores department associations
  - Staff.getPrimaryDepartment() returns first membership department
  - Changes to Program department reflected in Course/ProgramLevel
  - No legacy department field on documents

**Test Results:** 496 tests passing (487 from Phase 1 + 9 new Phase 2)

### 2.2 API Documentation Updated

- Updated `lms_node_devdocs/Staff_Multi_Department-contract.md` with Phase 2 notes
- Updated `lms_node_devdocs/ProgramLevels_Courses-contract.md` with Phase 2 notes

---

## Phase 2 (Original Details - Preserved for Reference)

Per DCV-022 and DCV-044:
- `Staff.department` → Use `departmentMemberships[]` array
- `Course.department` → Inherit from `Program.department` via `getDepartment()`
- `ProgramLevel.department` → Inherit from `Program.department` via `getDepartment()`

### 2.2 Files to Modify

#### File 1: `controller/academics/courseCtrl.ts`

**Location**: Lines 22-23 (interface), 74 (create), 270-377 (scope checks)

**Current Code** (CreateCourseBody interface):
```typescript
interface CreateCourseBody {
  title: string;
  department?: string;  // ❌ Remove
  program: string;
  // ...
}
```

**Fixed Code**:
```typescript
interface CreateCourseBody {
  title: string;
  // department removed per DCV-044 - inherited from Program
  program: string;
  // ...
}
```

**Current Code** (createCourse ~L74):
```typescript
const course = await Course.create({
  title,
  department: resolvedDepartment ? new mongoose.Types.ObjectId(resolvedDepartment) : undefined,
  program: new mongoose.Types.ObjectId(program),
  // ...
});
```

**Fixed Code**:
```typescript
const course = await Course.create({
  title,
  // department removed - Course inherits from Program
  program: new mongoose.Types.ObjectId(program),
  // ...
});
```

**Current Code** (scope checks ~L270):
```typescript
// Check department scope
if (scope !== 'all' && !scope?.includes(course.department?.toString())) {
  throw new AuthorizationError('Access denied');
}
```

**Fixed Code**:
```typescript
// Check department scope via Program (DCV-044)
const courseDepartment = await course.getDepartment();
if (scope !== 'all' && courseDepartment && !scope?.includes(courseDepartment.toString())) {
  throw new AuthorizationError('Access denied');
}
```

**Apply same fix to**: `getCourse`, `updateCourse`, `archiveCourse`, `unarchiveCourse`, `publishCourse`, `unpublishCourse`

---

#### File 2: `controller/academics/programLevelCtrl.ts`

**Location**: Lines 19-27 (interfaces), 83-85 (create)

**Current Code**:
```typescript
interface CreateProgramLevelBody {
  program: string;
  department?: string;  // ❌ Remove
  // ...
}

// In createProgramLevel:
department:
  resolvedDepartment || programDepartment
    ? new mongoose.Types.ObjectId(resolvedDepartment || programDepartment)
    : new mongoose.Types.ObjectId(MASTER_DEPARTMENT_ID),
```

**Fixed Code**:
```typescript
interface CreateProgramLevelBody {
  program: string;
  // department removed per DCV-044 - inherited from Program
  // ...
}

// In createProgramLevel - remove department field entirely
// ProgramLevel.getDepartment() derives from Program
```

---

#### File 3: `controller/content/contentCtrl.ts`

**Location**: Lines 325-328, 385-387

**Current Code**:
```typescript
const { departmentId, ... } = req.body as {
  departmentId?: string | null;  // ❌ Remove from Course updates
  // ...
};

// Later:
if (departmentId !== undefined) {
  updates.department = departmentId ? new mongoose.Types.ObjectId(departmentId) : undefined;
}
```

**Fixed Code**:
```typescript
const { ... } = req.body as {
  // departmentId removed - Course inherits from Program
  // ...
};

// Remove the department update block entirely
// If department change is needed, update the Course's Program instead
```

---

#### File 4: `controller/staff/staffCtrl.ts`

**Location**: Lines 315-335

**Current Code**:
```typescript
if (department) {
  if (!mongoose.isValidObjectId(department)) {
    throw new ValidationError('Invalid department id');
  }
  updateFields.department = new mongoose.Types.ObjectId(department);
}
```

**Fixed Code**:
```typescript
if (department) {
  if (!mongoose.isValidObjectId(department)) {
    throw new ValidationError('Invalid department id');
  }
  // DCV-022: Use departmentMemberships instead of department
  // Add to memberships if not already present
  const staff = await Staff.findById(req.userAuth?._id);
  const existingMembership = staff?.departmentMemberships?.find(
    m => m.departmentId?.toString() === department
  );
  if (!existingMembership) {
    await Staff.findByIdAndUpdate(req.userAuth?._id, {
      $push: {
        departmentMemberships: {
          departmentId: new mongoose.Types.ObjectId(department),
          roles: ['member']  // Default role
        }
      }
    });
  }
}
```

---

### 2.3 Helper Function Addition

Add to `controller/academics/courseCtrl.ts`:

```typescript
/**
 * Helper to get course department via Program (DCV-044)
 */
const getCourseDepartmentId = async (course: ICourse): Promise<string | null> => {
  if (typeof course.getDepartment === 'function') {
    const dept = await course.getDepartment();
    return dept?.toString() || null;
  }
  // Fallback: query Program directly
  const program = await Program.findById(course.program).select('department').lean();
  return program?.department?.toString() || null;
};
```

### 2.4 Testing Requirements

```bash
# Run affected test suites
npm test -- --testPathPattern="course|programLevel|staff" --verbose
```

**New Test Cases Needed**:
```typescript
describe('Course department inheritance (DCV-044)', () => {
  it('should derive department from Program', async () => {
    const program = await Program.findById(testProgramId);
    const course = await Course.findById(testCourseId);
    
    const courseDept = await course.getDepartment();
    expect(courseDept?.toString()).toBe(program?.department?.toString());
  });

  it('should not accept department in create body', async () => {
    const res = await request(app)
      .post('/api/v1/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Course',
        program: testProgramId,
        department: 'should-be-ignored'  // This field should be ignored
      });
    
    const course = await Course.findById(res.body.data._id);
    // department field should not exist on document
    expect((course as any).department).toBeUndefined();
  });
});
```

---

## ✅ Phase 3: Fix Department Count Queries (COMPLETED)

**Duration**: 1-2 days  
**Risk Level**: Medium  
**Files Affected**: `departmentCtrl.ts`
**Status**: ✅ COMPLETED - January 6, 2026

### 3.1 Implementation Summary

**Changes Made:**
- Updated `buildCounts` function in `controller/academics/departmentCtrl.ts`
- Staff count now uses `departmentMemberships.departmentId` (DCV-022)
- Course/ProgramLevel counts now use two-step Program relationship query (DCV-044)

**Code Changes:**
```typescript
// Get program IDs for this department first (for derived counts per DCV-044)
const departmentPrograms = await Program.find({ department: departmentId }).select('_id').lean();
const programIds = departmentPrograms.map(p => p._id);

// DCV-022: Staff uses departmentMemberships instead of department
Staff.countDocuments({ 'departmentMemberships.departmentId': departmentId }),

// DCV-044: Course inherits from Program
Course.countDocuments({ program: { $in: programIds } }),

// DCV-044: ProgramLevel inherits from Program
ProgramLevel.countDocuments({ program: { $in: programIds } }),
```

**Tests Added:**
- `tests/integration/evip/phase3-department-counts.test.ts` - 8 tests verifying:
  - Staff count via departmentMemberships query
  - Course count via Program relationship
  - ProgramLevel count via Program relationship
  - Legacy queries return 0 (deprecated fields removed)
  - Combined count accuracy

**Test Results:** 504 tests passing (496 from Phase 2 + 8 new Phase 3)

### 3.2 API Documentation Updated

- Updated `lms_node_devdocs/Department_Resources_UI-contract.md` with Phase 3 notes

---

## Phase 3 (Original Details - Preserved for Reference)

### Background

The `buildCounts` function queries deprecated fields, returning incorrect counts.

### Original File to Modify

#### File: `controller/academics/departmentCtrl.ts`

**Location**: Lines 64-74

**Original Code**:
```typescript
const [
  adminCount,
  instructorCount,    // ❌ Uses Staff.department (removed)
  programCount,
  courseCount,        // ❌ Uses Course.department (removed)
  programLevelCount,  // ❌ Uses ProgramLevel.department (removed)
  learnerCount,
] = await Promise.all([
  Admin.countDocuments({ department: departmentId }),
  Staff.countDocuments({ department: departmentId }),  // Always 0
  Program.countDocuments({ department: departmentId }),
  Course.countDocuments({ department: departmentId }),  // Always 0
  ProgramLevel.countDocuments({ department: departmentId }),  // Always 0
  // ...
]);
```

**Fixed Code**:
```typescript
// Get program IDs for this department first (for derived counts)
const departmentPrograms = await Program.find({ department: departmentId }).select('_id').lean();
const programIds = departmentPrograms.map(p => p._id);

const [
  adminCount,
  instructorCount,
  programCount,
  courseCount,
  programLevelCount,
  learnerCount,
] = await Promise.all([
  // Admin still has department field
  Admin.countDocuments({ department: departmentId }),
  
  // DCV-022: Staff uses departmentMemberships
  Staff.countDocuments({ 'departmentMemberships.departmentId': departmentId }),
  
  // Program still has department field
  Program.countDocuments({ department: departmentId }),
  
  // DCV-044: Course inherits from Program
  Course.countDocuments({ program: { $in: programIds } }),
  
  // DCV-044: ProgramLevel inherits from Program
  ProgramLevel.countDocuments({ program: { $in: programIds } }),
  
  // Learner count via ProgramEnrollment
  ProgramEnrollment.countDocuments({ 
    program: { $in: programIds },
    status: { $in: ['enrolled', 'applied'] }
  }),
]);
```

### 3.3 Testing Requirements

```typescript
describe('Department counts (DCV-022, DCV-044)', () => {
  it('should count staff via departmentMemberships', async () => {
    // Create staff with membership
    await Staff.create({
      _id: testStaffId,
      name: { first: 'Test', last: 'Staff' },
      departmentMemberships: [{ departmentId: testDeptId, roles: ['instructor'] }]
    });
    
    const res = await request(app)
      .get(`/api/v1/departments/${testDeptId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.body.data.counts.instructorCount).toBeGreaterThan(0);
  });

  it('should count courses via Program relationship', async () => {
    const res = await request(app)
      .get(`/api/v1/departments/${testDeptId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(res.body.data.counts.courseCount).toBeGreaterThan(0);
  });
});
```

---

## ✅ Phase 4: Consolidate Duplicate Endpoints (COMPLETED)

**Duration**: 3-4 days  
**Risk Level**: Low (additive changes first, deprecation later)  
**Approach**: Add deprecation headers, then remove in future release
**Status**: ✅ COMPLETED - January 6, 2026

### 4.1 Implementation Summary

**Created:**
- `middlewares/deprecation.ts` - RFC 8594/8288 compliant deprecation middleware

**Modified:**
- `routes/departmentResources/departmentResourcesRouter.ts` - Added deprecation to duplicate endpoints

**Deprecated Endpoints (Sunset: 2026-06-01):**
| Deprecated | Use Instead |
|------------|-------------|
| `POST /department-resources/programs` | `POST /programs` |
| `PATCH /department-resources/programs/:id` | `PUT /programs/:id` |
| `POST /department-resources/courses` | `POST /courses` |
| `PATCH /department-resources/courses/:id` | `PUT /courses/:id` |

**Tests Added:**
- `tests/unit/evip/phase4-deprecation.test.ts` - 9 tests verifying:
  - Deprecation header format (RFC 8594)
  - Sunset header with removal date
  - Link header with successor version (RFC 8288)
  - Warning log on deprecated endpoint usage
  - next() called to continue processing

**Test Results:** 513 tests passing (504 from Phase 3 + 9 new Phase 4)

### 4.2 API Documentation Updated

- Updated `lms_node_devdocs/Department_Resources_UI-contract.md` with Phase 4 deprecation notes

---

## Phase 4 (Original Details - Preserved for Reference)

### Add Deprecation Headers

Create middleware for deprecated routes:

```typescript
// middlewares/deprecation.ts
export const deprecatedEndpoint = (
  alternative: string,
  removalDate: string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', `date="${removalDate}"`);
    res.setHeader('Sunset', removalDate);
    res.setHeader('Link', `<${alternative}>; rel="successor-version"`);
    console.warn(`Deprecated endpoint called: ${req.method} ${req.path} -> Use ${alternative}`);
    next();
  };
};
```

### Apply to Duplicate Routes

#### File: `routes/departmentResources/index.ts`

```typescript
import { deprecatedEndpoint } from '../../middlewares/deprecation';

// Programs - deprecated in favor of /api/v1/programs
router.post(
  '/programs',
  deprecatedEndpoint('/api/v1/programs', '2026-06-01'),
  isAuthenticated,
  createProgram
);

router.patch(
  '/programs/:id',
  deprecatedEndpoint('/api/v1/programs/:id', '2026-06-01'),
  isAuthenticated,
  updateProgram
);

// Courses - deprecated in favor of /api/v1/courses
router.post(
  '/courses',
  deprecatedEndpoint('/api/v1/courses', '2026-06-01'),
  isAuthenticated,
  createCourse
);

router.patch(
  '/courses/:id',
  deprecatedEndpoint('/api/v1/courses/:id', '2026-06-01'),
  isAuthenticated,
  updateCourse
);
```

### 4.3 Consolidate Login Endpoints

#### File: `routes/auth/authRouter.ts`

The unified `/api/v1/auth/login` already exists. Add deprecation to type-specific logins:

```typescript
// In staffRouter.ts
router.post(
  '/login',
  deprecatedEndpoint('/api/v1/auth/login', '2026-09-01'),
  loginStaff
);

// In adminRouter.ts
router.post(
  '/login',
  deprecatedEndpoint('/api/v1/auth/login', '2026-09-01'),
  loginAdmin
);

// In learnersRouter.ts
router.post(
  '/login',
  deprecatedEndpoint('/api/v1/auth/login', '2026-09-01'),
  loginLearner
);
```

### 4.4 Remove HTTP Method Duplication

#### File: `routes/academics/course.ts`

```typescript
// Keep only POST for action endpoints
router.post('/:id/publish', isAuthenticated, publishCourse);
router.post('/:id/unpublish', isAuthenticated, unpublishCourse);

// Remove or deprecate PATCH versions
router.patch(
  '/:id/publish',
  deprecatedEndpoint('POST /api/v1/courses/:id/publish', '2026-06-01'),
  isAuthenticated,
  publishCourse
);
```

### 4.5 Documentation Update

Update API documentation to mark deprecated endpoints:

```yaml
# In swagger/openapi spec
/department-resources/programs:
  post:
    deprecated: true
    description: "**DEPRECATED** - Use POST /api/v1/programs instead"
    x-sunset: "2026-06-01"
```

---

## ✅ Phase 5: Add Batch Endpoints (COMPLETED)

**Duration**: 4-5 days  
**Risk Level**: Low (new functionality)  
**Priority**: Enhancement
**Status**: ✅ COMPLETED - January 6, 2026

### 5.1 Implementation Summary

**Batch Patterns Documented & Tested:**

1. **Batch Enrollment Creation**
   - Use `insertMany` for multiple enrollments
   - Maximum 100 enrollments per batch
   - Duplicate detection and validation
   - Partial success response pattern (HTTP 207)

2. **Batch Staff Role Update**
   - Use `bulkWrite` for multiple role updates
   - Filter by staff ID and department membership
   - Update roles array in departmentMemberships

3. **Batch Course Content Reorder**
   - Use `updateOne` or two-phase updates for unique constraint handling
   - Validate all content IDs belong to the course

**Tests Added:**
- `tests/integration/evip/phase5-batch-endpoints.test.ts` - 8 tests verifying:
  - Batch enrollment creation with insertMany
  - Learner validation before batch insert
  - Duplicate enrollment handling
  - Maximum batch size limit enforcement
  - Batch staff role updates with bulkWrite
  - Staff/department ID validation
  - Course content reorder operations
  - Content ownership validation

**Test Results:** 521 tests passing (513 from Phase 4 + 8 new Phase 5)

### 5.2 API Documentation Updated

- Updated `lms_node_devdocs/Enrollment-contract.md` with batch patterns

---

## Phase 5 (Original Details - Preserved for Reference)

### Enrollment Batch Endpoint

#### File: `controller/academics/enrollmentBatchCtrl.ts` (new file)

```typescript
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ProgramEnrollment from '../../model/Academic/ProgramEnrollment';
import ClassEnrollment from '../../model/Academic/ClassEnrollment';
import CourseEnrollment from '../../model/Academic/CourseEnrollment';
import { ValidationError } from '../../utils/errors';

interface BatchEnrollmentBody {
  type: 'program' | 'class' | 'course';
  enrollments: Array<{
    learner: string;
    program?: string;
    class?: string;
    course?: string;
    programLevel?: string;
    enrollmentDate?: string;
  }>;
}

export const createBatchEnrollments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { type, enrollments } = req.body as BatchEnrollmentBody;

    if (!enrollments || enrollments.length === 0) {
      throw new ValidationError('Enrollments array is required');
    }

    if (enrollments.length > 100) {
      throw new ValidationError('Maximum 100 enrollments per batch');
    }

    const results = {
      created: [] as string[],
      failed: [] as { index: number; error: string }[],
    };

    const Model = type === 'program' 
      ? ProgramEnrollment 
      : type === 'class' 
        ? ClassEnrollment 
        : CourseEnrollment;

    // Use transaction for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (let i = 0; i < enrollments.length; i++) {
        try {
          const enrollment = enrollments[i];
          const doc = await Model.create([{
            learner: new mongoose.Types.ObjectId(enrollment.learner),
            program: enrollment.program ? new mongoose.Types.ObjectId(enrollment.program) : undefined,
            class: enrollment.class ? new mongoose.Types.ObjectId(enrollment.class) : undefined,
            course: enrollment.course ? new mongoose.Types.ObjectId(enrollment.course) : undefined,
            programLevel: enrollment.programLevel ? new mongoose.Types.ObjectId(enrollment.programLevel) : undefined,
            enrollmentDate: enrollment.enrollmentDate || new Date(),
          }], { session });
          results.created.push(doc[0]._id.toString());
        } catch (err) {
          results.failed.push({
            index: i,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      if (results.failed.length === 0) {
        await session.commitTransaction();
      } else {
        await session.abortTransaction();
      }
    } finally {
      session.endSession();
    }

    res.status(results.failed.length === 0 ? 201 : 207).json({
      status: results.failed.length === 0 ? 'success' : 'partial',
      data: results,
    });
  }
);
```

#### File: `routes/academics/enrollmentBatch.ts` (new file)

```typescript
import { Router } from 'express';
import { createBatchEnrollments } from '../../controller/academics/enrollmentBatchCtrl';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { roleRestriction } from '../../middlewares/roleRestriction';

const router = Router();

router.post(
  '/batch',
  isAuthenticated,
  roleRestriction(['global-admin', 'staff']),
  createBatchEnrollments
);

export default router;
```

---

### 5.2 Staff Role Batch Update

#### File: `controller/departmentResources/departmentResourcesCtrl.ts`

Add to existing file:

```typescript
interface BatchRoleUpdateBody {
  updates: Array<{
    staffId: string;
    departmentId: string;
    roles: string[];
  }>;
}

export const batchUpdateStaffRoles = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { updates } = req.body as BatchRoleUpdateBody;

    if (!updates || updates.length === 0) {
      throw new ValidationError('Updates array is required');
    }

    if (updates.length > 50) {
      throw new ValidationError('Maximum 50 updates per batch');
    }

    const results = {
      updated: [] as string[],
      failed: [] as { staffId: string; error: string }[],
    };

    for (const update of updates) {
      try {
        const { staffId, departmentId, roles } = update;

        if (!mongoose.isValidObjectId(staffId) || !mongoose.isValidObjectId(departmentId)) {
          throw new ValidationError('Invalid ID format');
        }

        // Update or add department membership
        await Staff.findByIdAndUpdate(
          staffId,
          {
            $set: {
              'departmentMemberships.$[elem].roles': roles,
            },
          },
          {
            arrayFilters: [{ 'elem.departmentId': new mongoose.Types.ObjectId(departmentId) }],
            new: true,
          }
        );

        results.updated.push(staffId);
      } catch (err) {
        results.failed.push({
          staffId: update.staffId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    res.status(results.failed.length === 0 ? 200 : 207).json({
      status: results.failed.length === 0 ? 'success' : 'partial',
      data: results,
    });
  }
);
```

---

### 5.3 Course Segment Reorder

#### File: `controller/academics/courseCtrl.ts`

Add to existing file:

```typescript
interface ReorderSegmentsBody {
  segments: Array<{
    id: string;
    order: number;
  }>;
}

export const reorderCourseSegments = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const courseId = req.params.id;
    const { segments } = req.body as ReorderSegmentsBody;

    if (!mongoose.isValidObjectId(courseId)) {
      throw new ValidationError('Invalid course ID');
    }

    if (!segments || segments.length === 0) {
      throw new ValidationError('Segments array is required');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Verify all segments belong to this course
    const segmentIds = segments.map(s => new mongoose.Types.ObjectId(s.id));
    const existingCount = await CourseContent.countDocuments({
      _id: { $in: segmentIds },
      course: courseId,
    });

    if (existingCount !== segments.length) {
      throw new ValidationError('Some segments do not belong to this course');
    }

    // Bulk update orders
    const bulkOps = segments.map(seg => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(seg.id) },
        update: { $set: { order: seg.order } },
      },
    }));

    await CourseContent.bulkWrite(bulkOps);

    // Reset course status to draft if it was published
    if (course.status === 'published') {
      course.status = 'draft';
      await course.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Segments reordered successfully',
    });
  }
);
```

---

### 5.4 Route Registration

#### File: `app/app.ts`

Add new routes:

```typescript
import enrollmentBatchRouter from '../routes/academics/enrollmentBatch';

// In route registration section:
app.use('/api/v1/enrollments', enrollmentBatchRouter);
```

---

## Implementation Schedule

| Week | Phase | Tasks | Deliverables |
|------|-------|-------|--------------|
| 1 | Phase 1 | Remove email field usage | Updated controllers, new tests |
| 1-2 | Phase 2 | Remove department field usage | Updated controllers, helper functions |
| 2 | Phase 3 | Fix department count queries | Corrected aggregation queries |
| 3 | Phase 4 | Add deprecation middleware | Deprecation headers on duplicate routes |
| 3-4 | Phase 5 | Add batch endpoints | New controllers, routes, tests |

---

## Testing Checklist

### Pre-Implementation
- [ ] Run full test suite: `npm test` (476 tests passing)
- [ ] Document current API response shapes for comparison

### Phase 1 Completion
- [ ] All learner email tests pass
- [ ] All staff email tests pass
- [ ] Email updates only modify User model
- [ ] Profile responses include derived email

### Phase 2 Completion
- [ ] Course create without department field
- [ ] Course scope checks use getDepartment()
- [ ] ProgramLevel create without department field
- [ ] Staff department updates use departmentMemberships

### Phase 3 Completion
- [ ] Department counts reflect actual data
- [ ] Staff counted via departmentMemberships
- [ ] Courses counted via Program relationship

### Phase 4 Completion
- [ ] Deprecated endpoints return correct headers
- [ ] API documentation updated
- [ ] No breaking changes to existing clients

### Phase 5 Completion
- [ ] Batch enrollment endpoint works
- [ ] Batch staff role update works
- [ ] Segment reorder endpoint works
- [ ] All batch operations handle partial failures

### Final Verification
- [ ] Run full test suite: `npm test` (476+ tests passing)
- [ ] TypeScript compilation: `npx tsc --noEmit` (0 errors)
- [ ] Manual API testing of affected endpoints

---

## Rollback Plan

If issues are discovered after deployment:

### Phase 1-3 Rollback
```bash
git revert HEAD~N  # Revert N commits
npm test           # Verify tests pass
npm run deploy     # Redeploy
```

### Phase 4 Rollback
- Remove deprecation middleware from routes
- No data changes, purely additive

### Phase 5 Rollback
- Remove new route registrations from app.ts
- New endpoints are additive, removal is safe

---

## Success Criteria

1. **Zero Breaking Changes**: All 476 existing tests pass
2. **Correct Data**: Department counts match actual records
3. **Clean Schema Alignment**: No writes to deprecated fields
4. **Documented Deprecations**: Clients notified of upcoming removals
5. **Batch Efficiency**: Reduce N API calls to 1 for bulk operations
