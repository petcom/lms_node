# API V2 Revision - Implementation Plan

> **Date:** 2025-01-06  
> **Status:** Planning  
> **Target Completion:** TBD

---

## Overview

This document tracks all API features that are documented in contracts but not fully implemented, along with implementation tasks.

---

## 1. Incomplete Features Inventory

### 1.1 Batch Endpoints (EVIP Phase 5)

**Status:** 🔴 Pattern Documented, Not Implemented

The batch operation patterns were established in EVIP Phase 5 testing, but REST endpoints are not implemented.

| Endpoint | Purpose | Max Batch Size |
|----------|---------|----------------|
| `POST /program-enrollments/batch` | Batch create program enrollments | 100 |
| `POST /class-enrollments/batch` | Batch create class enrollments | 100 |
| `POST /course-enrollments/batch` | Batch create course enrollments | 100 |
| `PATCH /staff/roles/batch` | Batch update staff roles | 50 |
| `PATCH /course-contents/batch` | Batch update course content order/weights | 100 |

**Files to Create/Modify:**
- `controller/academics/enrollmentBatchCtrl.ts` (new)
- `routes/academics/enrollmentRouter.ts` (add batch routes)
- `validators/batchValidators.ts` (new)

**Decision:** ✅ Implement in V2

---

### 1.2 Credential Management Endpoints

**Status:** 🔴 Model Exists, Endpoints Partial

The Credential model was created in DCV-031, but full CRUD and learner-facing endpoints are missing.

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /credentials` | List credential definitions | 🔴 Missing |
| `POST /credentials` | Create credential | 🔴 Missing |
| `GET /credentials/:id` | Get credential by ID | 🔴 Missing |
| `PUT /credentials/:id` | Update credential | 🔴 Missing |
| `DELETE /credentials/:id` | Archive credential | 🔴 Missing |
| `GET /credentials/:id/eligible-learners` | List eligible learners | 🔴 Missing |
| `POST /credentials/:id/award` | Award to learner | 🔴 Missing |
| `GET /learners/:id/credentials` | Learner's earned credentials | 🔴 Missing |
| `GET /learners/my-credentials` | Current learner's credentials | 🔴 Missing |

**Files to Create:**
- `controller/academics/credentialCtrl.ts` (new)
- `routes/academics/credentialRouter.ts` (new)
- `validators/credentialValidators.ts` (new)

**Decision:** ⏸️ **DEFERRED** - Create separate credential management system implementation document. Do NOT include in V2 changes.

**Reason:** Full credential system requires:
- 5-year credential retention
- Store scores for all course segments
- Track completion status for all course segments
- Store PDF of credential achieved
- Comprehensive learner views and awarding workflow

---

### 1.3 Course Department Convenience Field

**Status:** 🟡 Pending Decision

Course responses currently require Program population to access department. A convenience field would improve UI efficiency.

| Change | Description |
|--------|-------------|
| Modify `getCourse()` | Call `getDepartment()` and include in response |
| Modify `getCourses()` | Add department to list items |
| Update contract | Document the convenience field |

**Files to Modify:**
- `controller/academics/courseCtrl.ts`

**Decision:** ✅ Implement in V2

---

### 1.4 Unified Course History Endpoint

**Status:** 🟡 Pending Decision

Currently separate endpoints for Current and Activity enrollments. A unified view may be needed.

| Endpoint | Purpose |
|----------|---------|
| `GET /learners/:id/course-history` | Combined Current + Activity records |

**Query Parameters:**
- `status=active|completed|withdrawn|all`
- `programId` - Filter by program
- `page`, `limit`

**Files to Create:**
- Add to `controller/learners/learnersCtrl.ts`
- Add to `routes/learners/learnersRouter.ts`

**Decision:** ✅ Implement in V2

---

### 1.5 Public Feature Flags Endpoint

**Status:** 🟡 Pending Decision

Feature flags currently require authentication. A public endpoint would allow pre-login UI configuration.

| Endpoint | Purpose |
|----------|---------|
| `GET /settings/features` | Public feature flags (no auth) |

**Files to Modify:**
- `controller/settingsCtrl.ts` (add public method)
- `routes/settingsRouter.ts` (add public route)

**Decision:** ❌ **NOT NEEDED** - Use .env variables instead.

**Implementation:** 
- Add feature flag environment variables to `.env` and `.env.example`
- Enable all features by default
- UI will not need pre-login feature flag checks

---

### 1.6 CourseEnrollmentCurrent/Activity Service Functions

**Status:** 🟡 Models Complete, Services Partial

The models exist but the transition service (`completeCourseEnrollment`) may need refinement.

| Function | Purpose | Status |
|----------|---------|--------|
| `startCourseEnrollment()` | Create Current record | 🔴 Missing |
| `updateCourseProgress()` | Update Current progress | 🔴 Missing |
| `completeCourseEnrollment()` | Move Current → Activity | 🟡 Partial |
| `withdrawFromCourse()` | Move Current → Activity (withdrawn) | 🔴 Missing |

**Files to Create/Modify:**
- `utils/enrollmentService.ts` (new or expand)

---

## 2. Implementation Tasks

### Phase 1: High Priority (Week 1-2)

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| **T1.1** | Create batch enrollment controller | 4h | None |
| **T1.2** | Create batch enrollment validators | 2h | None |
| **T1.3** | Add batch routes to enrollment router | 1h | T1.1, T1.2 |
| **T1.4** | Write batch enrollment tests | 3h | T1.3 |
| **T1.5** | Update Enrollment-api-contract.md | 1h | T1.4 |

### Phase 2: Medium Priority (Week 2-3)

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| **T2.1** | Add department to Course responses | 2h | None |
| **T2.2** | Create unified course history endpoint | 3h | None |
| **T2.3** | Add feature flags to .env and .env.example | 1h | None |
| **T2.4** | Create enrollment service functions | 4h | None |
| **T2.5** | Write tests for T2.1-T2.4 | 3h | T2.1-T2.4 |
| **T2.6** | Update contracts and API_Index.md | 2h | T2.5 |

> **Note:** Credential management (originally T2.1-T2.6) has been deferred to a separate implementation.

### Phase 3: Final Testing & Documentation (Week 3)

| Task ID | Task | Estimate | Dependencies |
|---------|------|----------|--------------|
| **T3.1** | Integration testing - all new endpoints | 4h | Phase 1-2 |
| **T3.2** | Update Enrollment-api-contract.md (batch endpoints) | 1h | T1.5 |
| **T3.3** | Update Academic-api-contract.md (department field) | 1h | T2.1 |
| **T3.4** | Final API_Index.md update | 1h | T3.2, T3.3 |
| **T3.5** | Create Credential-system-plan.md (future) | 2h | None |

---

## 3. Task Details

### T1.1: Create Batch Enrollment Controller

**File:** `controller/academics/enrollmentBatchCtrl.ts`

```typescript
// Functions to implement:
export const batchCreateProgramEnrollments = asyncHandler(async (req, res) => {
  // Validate max 100 items
  // Validate all learner IDs exist
  // Validate all program IDs exist
  // Check for duplicate enrollments
  // Use insertMany with ordered: false
  // Return created[] and failed[] arrays
});

export const batchCreateClassEnrollments = asyncHandler(async (req, res) => { ... });
export const batchCreateCourseEnrollments = asyncHandler(async (req, res) => { ... });
export const batchUpdateStaffRoles = asyncHandler(async (req, res) => { ... });
```

**Acceptance Criteria:**
- [ ] Maximum batch size enforced (100 for enrollments, 50 for roles)
- [ ] All IDs validated before insertion
- [ ] Duplicate detection and skip
- [ ] Partial success handling (207 Multi-Status)
- [ ] Response includes created[] and failed[] arrays

---

### T2.1: Add Department to Course Responses

**File:** `controller/academics/courseCtrl.ts`

```typescript
// Modify getCourse and getCourses to include department
export const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id).populate('program');
  const department = await course.getDepartment();
  res.json({
    ...course.toObject(),
    department: department ? { _id: department._id, name: department.name } : null
  });
});
```

**Acceptance Criteria:**
- [ ] Department included in single course GET response
- [ ] Department included in course list responses
- [ ] Null handled gracefully if program has no department
- [ ] Performance acceptable (consider caching)

---

### T3.4: Create Enrollment Service Functions

**File:** `utils/enrollmentService.ts`

```typescript
// Functions to implement:
export const startCourseEnrollment = async (learnerId, courseId, programEnrollmentId) => {
  // Create CourseEnrollmentCurrent record
  // Initialize progress object
  // Return enrollment record
};

export const updateCourseProgress = async (currentId, progressUpdate) => {
  // Update examAttempts, mediaProgress, scormAttempts
  // Recalculate overall progress
  // Return updated record
};

export const completeCourseEnrollment = async (currentId, outcome, grade) => {
  // Create CourseEnrollmentActivity from Current
  // Delete CourseEnrollmentCurrent
  // Update ProgramEnrollment if all courses complete
  // Return activity record
};

export const withdrawFromCourse = async (currentId, reason) => {
  // Create CourseEnrollmentActivity with outcome='withdrawn'
  // Delete CourseEnrollmentCurrent
  // Return activity record
};
```

**Acceptance Criteria:**
- [ ] Atomic operations (transaction or careful ordering)
- [ ] Progress calculation from sub-components
- [ ] ProgramEnrollment status update on completion
- [ ] Audit trail maintained

---

## 4. Testing Requirements

### New Test Files Needed

| Test File | Coverage |
|-----------|----------|
| `tests/integration/batch/enrollment-batch.test.ts` | Batch enrollment endpoints |
| `tests/integration/courses/course-department.test.ts` | Department convenience field |
| `tests/integration/learners/course-history.test.ts` | Unified course history endpoint |
| `tests/unit/services/enrollment-service.test.ts` | Service functions |

### Test Scenarios

**Batch Enrollments:**
- [ ] Batch of 100 succeeds
- [ ] Batch of 101 rejected
- [ ] Partial success returns 207
- [ ] Duplicate detection works
- [ ] Invalid IDs reported in failed[]

**Course Department Field:**
- [ ] Department included in GET /courses/:id
- [ ] Department included in GET /courses list
- [ ] Null department handled gracefully

**Unified Course History:**
- [ ] Returns both Current and Activity records
- [ ] Status filter works (active/completed/withdrawn/all)
- [ ] Pagination works correctly
- [ ] Only returns learner's own records

---

## 5. Documentation Updates

After implementation, update these documents:

| Document | Updates |
|----------|---------|
| `Enrollment-api-contract.md` | Add batch endpoints section |
| `Academic-api-contract.md` | Document department convenience field in Course responses |
| `Enrollment-api-contract.md` | Document unified course history endpoint |
| `.env.example` | Add feature flag environment variables |
| `API_Index.md` | Add new endpoints to quick reference |

### Future Documentation (Separate Implementation)

| Document | Purpose |
|----------|--------|
| `Credential-system-plan.md` | Full credential management system design |
| `Credentials-api-contract.md` | Credential API contract (when implemented) |

---

## 6. Timeline

```
Week 1: Phase 1 - Batch Endpoints (T1.1-T1.5)
Week 2: Phase 2 - Department Field, Course History, Env Config, Services (T2.1-T2.6)
Week 3: Phase 3 - Final Testing & Documentation (T3.1-T3.5)
```

**Total Estimated Effort:** ~26 hours

> **Note:** Credential management system has been deferred to a separate implementation sprint.

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-06 | API Team | Initial implementation plan |
