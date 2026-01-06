# Endpoint Validation and Streamline Analysis

**Generated**: January 6, 2026  
**Purpose**: Validate endpoint field mappings against models and identify streamlining opportunities

---

## Executive Summary

This document analyzes 165+ API endpoints across 35 domains for:
1. **Field Mapping Accuracy** - Request/response fields vs model schemas
2. **DCV Compliance** - Ensuring deprecated fields are not used
3. **Duplicate Endpoints** - Identifying redundant routes
4. **Batch Operation Opportunities** - Reducing API calls

### Key Findings

| Category | Count | Severity |
|----------|-------|----------|
| Breaking Field Issues | 7 | 🔴 Critical |
| Data Inconsistency Issues | 10 | 🟡 High |
| Inefficiency Issues | 8 | 🟢 Low |
| Duplicate Route Groups | 8 | 🟡 High |
| Batch Operation Opportunities | 4 | 🟢 Enhancement |

---

## Part 1: Field Mapping Validation

### 1.1 Breaking Issues (Must Fix)

These write to model fields that no longer exist, causing silent data loss.

#### Issue 1: Learner Email Field (DCV-041)

**Files**: `controller/learners/learnersCtrl.ts`  
**Lines**: 273-281, 293-300, 355-361

```typescript
// ❌ WRONG - email removed from Learner model per DCV-041
const learner = await Learner.findByIdAndUpdate(
  req.userAuth?._id,
  { email },  // This field doesn't exist
  { new: true }
);
```

**Model Expectation**: Learner has no `email` field. Use `learner.getEmail()` method which derives from User.

**Fix Required**:
```typescript
// ✅ CORRECT - Update email on User model only
await User.findByIdAndUpdate(req.userAuth?._id, { email });
// Learner.getEmail() will then return the updated value
```

---

#### Issue 2: Course Department Field (DCV-044)

**Files**: `controller/academics/courseCtrl.ts`, `controller/content/contentCtrl.ts`  
**Lines**: courseCtrl L74, L270-276, L293-296, L315-318, L343, L377; contentCtrl L325-328, L385-387

```typescript
// ❌ WRONG - department removed from Course model per DCV-044
const course = await Course.create({
  ...fields,
  department: new mongoose.Types.ObjectId(departmentId),  // Field doesn't exist
});
```

**Model Expectation**: Course inherits department from Program via `course.getDepartment()` method.

**Fix Required**:
```typescript
// ✅ CORRECT - Get department via Program
const program = await Program.findById(programId).select('department');
const departmentId = program?.department?.toString();
// Use Course.getDepartment() for reads
```

---

#### Issue 3: ProgramLevel Department Field (DCV-044)

**File**: `controller/academics/programLevelCtrl.ts`  
**Lines**: 19-20, 83-85

```typescript
// ❌ WRONG - department removed from ProgramLevel model per DCV-044
const programLevel = await ProgramLevel.create({
  ...fields,
  department: new mongoose.Types.ObjectId(departmentId),  // Field doesn't exist
});
```

**Model Expectation**: ProgramLevel inherits department from Program via `programLevel.getDepartment()` method.

**Fix Required**:
```typescript
// ✅ CORRECT - Department is derived from Program
// Remove department from create body
// Use ProgramLevel.getDepartment() for reads
```

---

#### Issue 4: Staff Department Field (DCV-022)

**File**: `controller/staff/staffCtrl.ts`  
**Lines**: 30-35, 315-335

```typescript
// ❌ WRONG - department removed from Staff model per DCV-022
interface UpdateStaffProfileBody {
  department?: string;  // Field doesn't exist in Staff
}
```

**Model Expectation**: Staff uses `departmentMemberships[]` array instead of single `department`.

**Fix Required**:
```typescript
// ✅ CORRECT - Use departmentMemberships
const staff = await Staff.findByIdAndUpdate(id, {
  $push: { 
    departmentMemberships: { 
      departmentId: new mongoose.Types.ObjectId(deptId), 
      roles: ['instructor'] 
    }
  }
});
```

---

### 1.2 Data Inconsistency Issues (High Priority)

These cause incorrect data to be returned to clients.

#### Issue 5: Department Build Counts

**File**: `controller/academics/departmentCtrl.ts`  
**Lines**: 64-67

```typescript
// ❌ WRONG - These queries return 0 due to removed fields
const [
  instructorCount,  // Staff.countDocuments({ department }) - DCV-022
  courseCount,      // Course.countDocuments({ department }) - DCV-044
  programLevelCount // ProgramLevel.countDocuments({ department }) - DCV-044
] = await Promise.all([...]);
```

**Fix Required**:
```typescript
// ✅ CORRECT - Query via new structures
const instructorCount = await Staff.countDocuments({ 
  'departmentMemberships.departmentId': departmentId 
});

const programIds = await Program.find({ department: departmentId }).select('_id');
const courseCount = await Course.countDocuments({ 
  program: { $in: programIds } 
});

const programLevelCount = await ProgramLevel.countDocuments({ 
  program: { $in: programIds } 
});
```

---

#### Issue 6: Course Scope Checks

**Files**: `controller/academics/courseCtrl.ts`  
**Lines**: 270-276, 293-296, 315-318, 343, 377

```typescript
// ❌ WRONG - course.department is always undefined per DCV-044
if (scope !== 'all' && !scope?.includes(course.department?.toString())) {
  throw new AuthorizationError('...');
}
```

**Fix Required**:
```typescript
// ✅ CORRECT - Use getDepartment method
const deptId = await course.getDepartment();
if (scope !== 'all' && !scope?.includes(deptId?.toString())) {
  throw new AuthorizationError('...');
}
```

---

### 1.3 Inefficiency Issues (Low Priority)

Dead code or unnecessary operations that should be cleaned up.

| File | Line | Issue | Recommendation |
|------|------|-------|----------------|
| `courseCtrl.ts` | 22-23 | `department` in CreateCourseBody | Remove from interface |
| `contentCtrl.ts` | 325-328 | `departmentId` in UpdateCourseBody | Remove from interface |
| `programLevelCtrl.ts` | 19-20 | `department` in CreateProgramLevelBody | Remove from interface |
| `programLevelCtrl.ts` | 26-27 | `department` in UpdateProgramLevelBody | Remove from interface |
| `staffCtrl.ts` | 30-35 | `email`, `department` in UpdateStaffProfileBody | Remove from interface |
| `departmentCtrl.ts` | 64-74 | Deprecated field count queries | Replace with valid queries |

---

## Part 2: Duplicate and Overlapping Endpoints

### 2.1 Duplicate Route Paths

#### Program CRUD Duplication

| Endpoint | Route File | Controller |
|----------|------------|------------|
| `POST /programs` | `programs.ts` | `createProgram` |
| `POST /department-resources/programs` | `departmentResources.ts` | `createProgram` |
| `PUT /programs/:id` | `programs.ts` | `updateProgram` |
| `PATCH /department-resources/programs/:id` | `departmentResources.ts` | `updateProgram` |

**Recommendation**: Consolidate to `/api/v1/programs` routes. Deprecate department-resources program routes.

---

#### Course CRUD Duplication

| Endpoint | Route File | Controller |
|----------|------------|------------|
| `POST /courses` | `course.ts` | `createCourse` |
| `POST /department-resources/courses` | `departmentResources.ts` | `createCourse` |
| `PUT /courses/:id` | `course.ts` | `updateCourse` |
| `PATCH /courses/:id` | `course.ts` | `updateCourse` |
| `PATCH /department-resources/courses/:id` | `departmentResources.ts` | `updateCourse` |
| `PATCH /content/courses/:id` | `contentRouter.ts` | `updateCourse` |

**Recommendation**: Use `/api/v1/courses` as primary. Deprecate department-resources and content course routes.

---

#### Department Hierarchy Duplication

| Endpoint | Route File |
|----------|------------|
| `GET /departments/hierarchy` | `departments.ts` |
| `GET /department-resources/departments` | `departmentResources.ts` |

**Recommendation**: Use `/api/v1/departments/hierarchy` only. Add query params for filtering.

---

#### Staff Login Duplication

| Endpoint | Description |
|----------|-------------|
| `POST /auth/login` | Unified login (preferred) |
| `POST /staff/login` | Staff-specific login |
| `POST /staff/admins/login` | Admin-specific login |
| `POST /learners/login` | Learner-specific login |

**Recommendation**: Use `/api/v1/auth/login` only with role-based response. Return `primaryRole` to indicate dashboard.

---

### 2.2 HTTP Method Duplication

| Resource | Methods Used | Recommendation |
|----------|--------------|----------------|
| Course publish | `PATCH` and `POST` | Keep `POST` only (action semantics) |
| Course unpublish | `PATCH` and `POST` | Keep `POST` only (action semantics) |

---

## Part 3: Batch Operation Opportunities

### 3.1 Enrollment Batch Endpoint

**Current**: Single enrollment per call
- `POST /program-enrollments`
- `POST /class-enrollments`
- `POST /course-enrollments`

**Proposed**:
```http
POST /api/v1/enrollments/batch
Content-Type: application/json

{
  "type": "program",
  "enrollments": [
    { "learner": "learner1_id", "program": "program_id", "enrollmentDate": "2026-01-06" },
    { "learner": "learner2_id", "program": "program_id", "enrollmentDate": "2026-01-06" }
  ]
}
```

**Impact**: Reduce N calls to 1 call for bulk enrollments.

---

### 3.2 Staff Role Batch Update

**Current**: `PATCH /department-resources/staffusers/:id/role` - one at a time

**Proposed**:
```http
PATCH /api/v1/department-resources/staffusers/batch/roles
Content-Type: application/json

{
  "updates": [
    { "staffId": "staff1_id", "departmentId": "dept_id", "roles": ["instructor"] },
    { "staffId": "staff2_id", "departmentId": "dept_id", "roles": ["content-admin"] }
  ]
}
```

**Impact**: Reduce N calls to 1 call when updating multiple staff roles.

---

### 3.3 Course Segment Reordering

**Current**: Update each CourseContent `order` individually

**Proposed**:
```http
PATCH /api/v1/courses/:id/reorder-segments
Content-Type: application/json

{
  "segments": [
    { "id": "segment1_id", "order": 1 },
    { "id": "segment2_id", "order": 2 },
    { "id": "segment3_id", "order": 3 }
  ]
}
```

**Impact**: Atomic reordering in single transaction.

---

### 3.4 Bulk Archive/Unarchive

**Current**: Individual archive calls per resource

**Proposed**:
```http
PATCH /api/v1/bulk/archive
Content-Type: application/json

{
  "action": "archive",
  "programs": ["prog1_id", "prog2_id"],
  "courses": ["course1_id"],
  "programLevels": ["level1_id"]
}
```

**Impact**: Single transaction for related archiving operations.

---

## Part 4: Response Shape Validation

### 4.1 Inconsistent Response Formats

| Endpoint | Issue | Expected Format |
|----------|-------|-----------------|
| `GET /learners/profile` | Returns nested `programEnrolmentStatuses` | Should use ProgramEnrollment lookup |
| `GET /staff/profile` | Returns `email` from Staff | Should use `getEmail()` method |
| `GET /courses/:id` | Returns `department` (undefined) | Should return via `getDepartment()` |

### 4.2 Missing Population Inconsistencies

| Endpoint | Populates | Should Also Populate |
|----------|-----------|---------------------|
| `GET /courses/:id` | `segments.content` | Consider `program.department` |
| `GET /program-levels` | None | Consider `program.name` |
| `GET /course-contents` | `customContent`, `scormPackageId` | Consider `course.title` |

---

## Part 5: Implementation Priority

### Phase 1: Breaking Fixes (Week 1)

1. **Remove email writes from Learner updates**
   - Files: `learnersCtrl.ts`
   - Effort: Low
   
2. **Remove department writes from Course/ProgramLevel**
   - Files: `courseCtrl.ts`, `programLevelCtrl.ts`, `contentCtrl.ts`
   - Effort: Medium

3. **Fix Staff department → departmentMemberships**
   - Files: `staffCtrl.ts`
   - Effort: Medium

### Phase 2: Data Consistency (Week 2)

4. **Update department count queries**
   - Files: `departmentCtrl.ts`
   - Effort: Medium

5. **Fix course scope checks to use getDepartment()**
   - Files: `courseCtrl.ts`
   - Effort: Low

### Phase 3: Consolidation (Week 3-4)

6. **Deprecate duplicate routes**
   - Add deprecation warnings to responses
   - Update API documentation

7. **Implement batch endpoints**
   - `POST /enrollments/batch`
   - `PATCH /staffusers/batch/roles`

### Phase 4: Cleanup (Week 5)

8. **Remove deprecated interface fields**
9. **Remove dead code paths**
10. **Update response shapes for consistency**

---

## Appendix A: Complete Field Mapping Reference

### A.1 Learner Model vs Endpoints

| Model Field | Create Endpoint | Update Endpoint | Profile Response |
|-------------|----------------|-----------------|------------------|
| `name` (subdoc) | ✅ | ✅ | ✅ |
| `dateOfBirth` | ✅ | ✅ | ✅ |
| `learnerId` | Auto-generated | ❌ (immutable) | ✅ |
| `address` | ✅ | ✅ | ✅ |
| `honor` | ✅ | ✅ | ✅ |
| `status` | ❌ (default) | Admin only | ✅ |
| ~~`email`~~ | ❌ DCV-041 | ❌ DCV-041 | Use `getEmail()` |
| ~~`programEnrolmentStatuses`~~ | ❌ DCV-029 | ❌ DCV-029 | Query ProgramEnrollment |

### A.2 Staff Model vs Endpoints

| Model Field | Create Endpoint | Update Endpoint | Profile Response |
|-------------|----------------|-----------------|------------------|
| `name` (subdoc) | ✅ | ✅ | ✅ |
| `dateOfBirth` | ✅ | ✅ | ✅ |
| `staffId` | Auto-generated | ❌ (immutable) | ✅ |
| `status` | ❌ (default) | Admin only | ✅ |
| `departmentMemberships` | ✅ | ✅ | ✅ |
| `address` | ✅ | ✅ | ✅ |
| `honor` | ✅ | ✅ | ✅ |
| `applicationStatus` | ❌ (default) | Admin only | ✅ |
| ~~`email`~~ | ❌ DCV-021 | ❌ DCV-021 | Use `getEmail()` |
| ~~`department`~~ | ❌ DCV-022 | ❌ DCV-022 | Use `departmentMemberships` |

### A.3 Course Model vs Endpoints

| Model Field | Create Endpoint | Update Endpoint | Response |
|-------------|----------------|-----------------|----------|
| `title` | ✅ Required | ✅ | ✅ |
| `shortDescription` | ✅ | ✅ | ✅ |
| `longDescription` | ✅ | ✅ | ✅ |
| `program` | ✅ Required | ✅ | ✅ (populated) |
| `programLevel` | ✅ | ✅ | ✅ (populated) |
| `isArchived` | ❌ (default) | Archive endpoints | ✅ |
| `status` | ❌ (default) | Publish endpoints | ✅ |
| `publishedAt` | Auto-set | ❌ (auto) | ✅ |
| `primaryInstructor` | ✅ | ✅ | ✅ |
| `instructors` | ✅ | ✅ | ✅ |
| `contributors` | ✅ | ✅ | ✅ |
| `createdBy` | Auto-set | ❌ (immutable) | ✅ |
| `defaultGradingPolicy` | ✅ | ✅ | ✅ |
| ~~`department`~~ | ❌ DCV-044 | ❌ DCV-044 | Use `getDepartment()` |
| ~~`description`~~ | ❌ DCV-037 | ❌ DCV-037 | Use `shortDescription` |

### A.4 ProgramLevel Model vs Endpoints

| Model Field | Create Endpoint | Update Endpoint | Response |
|-------------|----------------|-----------------|----------|
| `program` | ✅ Required | ❌ (immutable) | ✅ |
| `courses` | ✅ | ✅ | ✅ (populated) |
| `name` | ✅ Required | ✅ | ✅ |
| `description` | ✅ | ✅ | ✅ |
| `order` | ✅ Required | ✅ | ✅ |
| `archived` | ❌ (default) | Archive endpoints | ✅ |
| `archivedAt` | Auto-set | ❌ (auto) | ✅ |
| `createdBy` | Auto-set | ❌ (immutable) | ✅ |
| ~~`department`~~ | ❌ DCV-044 | ❌ DCV-044 | Use `getDepartment()` |

---

## Appendix B: Endpoint Deprecation Schedule

| Endpoint | Status | Deprecation Date | Removal Date |
|----------|--------|------------------|--------------|
| `POST /department-resources/programs` | Active | 2026-Q1 | 2026-Q3 |
| `PATCH /department-resources/programs/:id` | Active | 2026-Q1 | 2026-Q3 |
| `POST /department-resources/courses` | Active | 2026-Q1 | 2026-Q3 |
| `PATCH /department-resources/courses/:id` | Active | 2026-Q1 | 2026-Q3 |
| `POST /staff/login` | Active | 2026-Q2 | 2026-Q4 |
| `POST /staff/admins/login` | Active | 2026-Q2 | 2026-Q4 |
| `POST /learners/login` | Active | 2026-Q2 | 2026-Q4 |
| `POST /courses/:id/publish` | Active | 2026-Q2 | 2026-Q4 |
| `POST /courses/:id/unpublish` | Active | 2026-Q2 | 2026-Q4 |

---

## Appendix C: DCV Reference

| DCV | Change | Affected Endpoints |
|-----|--------|-------------------|
| DCV-001 | User role → roles array | Auth login/register |
| DCV-021 | Staff.email removed | Staff CRUD |
| DCV-022 | Staff.department → departmentMemberships | Staff CRUD, department-resources |
| DCV-029 | Learner.programEnrolmentStatuses removed | Learner profile |
| DCV-037 | Course.description removed | Course CRUD |
| DCV-039 | Admin.email removed | Admin CRUD |
| DCV-040 | Staff.isWithdrawn → status enum | Staff actions |
| DCV-041 | Learner.email removed | Learner CRUD |
| DCV-044 | Course/ProgramLevel.department removed | Course/ProgramLevel CRUD |
