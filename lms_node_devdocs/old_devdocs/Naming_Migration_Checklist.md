# Naming Migration Checklist (Learner → Learner, Instructor → Instructor)

## Goal
Rename all occurrences of **learner → learner** and **instructor → instructor** across types, fields, enums, collection names, API paths, and docs.

## Phase A: Types & Models
- `types/models-types.ts`
  - `ILearner` → `ILearner`
  - `IStaff`/`IInstructor` → `IInstructor` (if split; otherwise rename staff-as-instructor)
  - Field names: `learnerId` → `learnerId`, `instructorId` → `instructorId`
- `types/express.d.ts`
  - `userType?: 'admin' | 'learner' | 'instructor'`
- Mongoose models
  - `model/Academic/Learner.ts` → `model/Academic/Learner.ts`
  - `model/Staff/Staff.ts` → `model/Staff/Instructor.ts` (or rename role naming in Staff)
  - Collection names: `learners` → `learners`, `instructors` → `instructors`

## Phase B: Controllers & Services
- `controller/learners/*` → `controller/learners/*`
- `controller/instructors/*` → `controller/instructors/*`
- Update all references:
  - `learnerId` → `learnerId`
  - `instructorId` → `instructorId`
  - `role: 'learner' | 'instructor'` → `role: 'learner' | 'instructor'`
- Authentication flows:
  - `/learners/login` → `/learners/login`
  - `/instructors/login` → `/instructors/login`

## Phase C: Routes
- `routes/learners/*` → `routes/learners/*`
- `routes/instructors/*` → `routes/instructors/*`
- Update path names:
  - `/api/v1/learners/*` → `/api/v1/learners/*`
  - `/api/v1/instructors/*` → `/api/v1/instructors/*`
- Update role restrictions to new role names.

## Phase D: Database Fields & Docs
- Collection fields:
  - `learner` → `learner` in foreign keys
  - `instructor` → `instructor` in foreign keys
- Update all contract/docs:
  - `lms_node_devdocs/*` (ERDs, contracts, phase notes)

## Phase E: Tests & Fixtures
- Rename test suites and fixtures:
  - `tests/integration/learners/*` → `tests/integration/learners/*`
  - `tests/integration/instructors/*` → `tests/integration/instructors/*`
- Update token names:
  - `test-learner-token` → `test-learner-token`
  - `test-instructor-token` → `test-instructor-token`

## Phase F: Migration Scripts
- Create data migration scripts:
  - Rename collections `learners` → `learners`
  - Rename collections `instructors` → `instructors`
  - Rename document fields `learnerId` → `learnerId`, `instructorId` → `instructorId`

## Final Validation
- Run full test suite
- Smoke test auth + role restrictions
- Verify all API responses use learner/instructor terms
