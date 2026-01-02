# Class-Course-Program Migration Plan

## Goal
Align the codebase and types with the new ERDs:
- Multi-program enrollment per learner
- ProgramLevel replaces ClassLevel
- Course is the unit of completion
- Content unified via CourseContent + ContentAttempt
- Program completion derived from CourseEnrollment
- Class is a cohort tied to a ProgramLevel
- Rename **learner → learner** and **instructor → instructor** everywhere (types, fields, enums, object names).

## Decisions
- Roles: `learner | staff | global-admin` (staff subtypes: instructor, department-admin, content-admin, billing-admin)
- API paths: use `/learners/*` and `/staff/*`
- No backwards-compatible aliases

## Scope
All changes are allowed (no clients attached). This plan covers:
- Type/interface updates
- Model/schema updates
- API/controller updates
- Test migrations
- Data migration scripts

## Phase 0: Inventory & Baseline
Status: ✅ completed
- Freeze new feature work. (verified)
- Export list of all usages of: (verified)
  - `ClassLevel`, `classLevels`, `currentClassLevel` (verified)
  - `program` on Learner (verified)
  - `scormProgress` and SCORM attempt-specific fields (verified)
  - `Exam`/custom content attachments (verified)
- Decide final collection names for: (verified)
  - `programLevels`, `classes`, `courses`, `courseContents`, `courseEnrollments`, `contentAttempts` (verified)

Deliverables:
- Inventory report of impacted files (verified) → `lms_node_devdocs/Class-Course-Program_Inventory_Report.md`
- Mapping table (old → new fields) (verified) → `lms_node_devdocs/Class-Course-Program_Migration_Plan.md`

## Phase 1: Type System Update (types.ts)
Status: ✅ completed
Update `types/models-types.ts` to reflect the ERDs:
- **Learner**
  - Add `globalStatus: 'active' | 'inactive'` (verified)
  - Remove or deprecate: `isGraduated`, `isPromoted*`, `currentClassLevel`, `classLevels`, `academicYear`, `yearGraduated`, `examResults`, `scormProgress` (verified in types)
- **Program**
  - Ensure `department` is required (verified in types)
- **ProgramLevel** (new) (verified in types)
- **ProgramEnrollment** (new) (verified in types)
- **Class** (new, cohort) (verified in types)
- **ClassEnrollment** (new) (verified in types)
- **Course** (new) (verified in types)
- **CourseContent** (new, unified) (verified in types)
- **CourseEnrollment** (new) (verified in types)
- **ContentAttempt** (new, unified) (verified in types)

Deliverables:
- Updated `types/models-types.ts` (verified)
- Deprecated fields documented in comments or a migration notes section (verified)

### Old → New Field Mapping (Concrete)
```
Learner.isGraduated                  -> ProgramEnrollment.status = "completed"
Learner.yearGraduated                -> ProgramEnrollment.completedAt
Learner.isPromotedToLevel200         -> ProgramLevel progress via CourseEnrollment
Learner.isPromotedToLevel300         -> ProgramLevel progress via CourseEnrollment
Learner.isPromotedToLevel400         -> ProgramLevel progress via CourseEnrollment
Learner.classLevels                  -> ClassEnrollment.classId (or ProgramEnrollment.programId)
Learner.currentClassLevel            -> Derived per ProgramEnrollment / CourseEnrollment
Learner.academicYear                 -> ProgramEnrollment.enrolledAt (and Program start/end)
Learner.examResults                  -> ContentAttempt (custom) + grading records
Learner.scormProgress                -> ContentAttempt (scorm) + CourseEnrollment progress
Learner.isSuspended / isWithdrawn    -> Learner.globalStatus (active|inactive) + legacy flags

ClassLevel (model + references)      -> ProgramLevel
Subject/Program attachments          -> Course (programId + levelId)
ScormPackage.program/classLevel      -> CourseContent.scormPackageId via CourseContent
CustomContent.program/classLevel     -> CourseContent.customContentId via CourseContent
ScormAttempt                          -> ContentAttempt (contentType="scorm")
CustomContentAttempt                  -> ContentAttempt (contentType="custom")
Learner                               -> Learner (type/interface/collection)
Instructor                               -> Instructor (type/interface/collection)
```

### Phase 1 File Checklist (Types Only)
Status: ✅ completed
Update or add type definitions in:
- `types/models-types.ts` (verified)
- `types/auth-types.ts` (if role or enrollment types are referenced) (verified)
- `types/express-types.d.ts` (if request typings reference learner fields) (verified)

Add new interfaces:
- `IProgramLevel` (verified)
- `IProgramEnrollment` (verified)
- `IClass` (verified)
- `IClassEnrollment` (verified)
- `ICourse` (verified)
- `ICourseContent` (verified)
- `ICourseEnrollment` (verified)
- `IContentAttempt` (verified)

Deprecate/remove fields on:
- `ILearner` (replace with `ILearner`; remove per-program/per-class fields listed above) (verified in types)

### Phase 2: Naming Migration (Student/Teacher → Learner/Staff)
Status: ✅ completed
Key rename targets:
- Types/interfaces: `IStudent` → `ILearner`, `ITeacher` → `IStaff` (verified)
- Collections: `students` → `learners`, `teachers` → `staff` (verified)
- Enums/roles: `student` → `learner`, `teacher` → `staff` (verified)
- API paths: `/students/*` → `/learners/*`, `/teachers/*` → `/staff/*` (verified)
- Request/response payload fields: `studentId` → `learnerId`, `teacherId` → `staffId` (verified)

### Phase 2 Prep: Fuller Checklist (Per File/Area)
Status: ✅ completed
Models to add:
- `model/Academic/ProgramLevel.ts` (verified)
- `model/Academic/Class.ts` (verified)
- `model/Content/Course.ts` (verified)
- `model/Academic/CourseContent.ts` (verified)
- `model/Academic/ProgramEnrollment.ts` (verified)
- `model/Academic/ClassEnrollment.ts` (verified)
- `model/Academic/CourseEnrollment.ts` (verified)
- `model/Academic/ContentAttempt.ts` (verified)

Models to update or retire:
- `model/Academic/ClassLevel.ts` (replace with ProgramLevel) (verified)
- `model/Academic/Learner.ts` (remove legacy fields, add globalStatus) (verified)
- `model/Academic/Subject.ts` (replace program/classLevel links with Course) (verified)
- `model/Scorm/ScormAttempt.ts` (sync into ContentAttempt) (verified)

Controllers likely impacted:
- `controller/learners/learnersCtrl.ts` (verified)
- `controller/academics/classLevelCtrl.ts` (replace with ProgramLevel) (verified)
- `controller/academics/programsCtrl.ts` (verified)
- `controller/academics/subjectCtrl.ts` (verified)
- `controller/scorm/scormAttemptCtrl.ts` (verified)
- `controller/scorm/scormPackageCtrl.ts` (verified)
- `controller/departmentResources/departmentResourcesCtrl.ts` (content list) (verified)
- `controller/instructors/instructorPackageCtrl.ts` (course-level ownership) (verified)

Routes likely impacted:
- `routes/academics/classLevel.ts` (replace with ProgramLevel routes) (verified)
- `routes/academics/program.ts` (verified)
- `routes/academics/subject.ts` (verified)
- `routes/scorm/scormAttemptRoutes.ts` (verified)
- `routes/scorm/scormPackageRoutes.ts` (verified)
- `routes/departmentResources/departmentResourcesRouter.ts` (verified)

Validators to update/add:
- `validators/academicValidation.ts` (programLevel/course/courseContent) (verified)
- `validators/departmentResourcesValidation.ts` (content filters) (verified)
- `validators/staffValidation.ts` (if staff-course ownership fields change) (verified)

Tests to update/add:
- `tests/integration/instructors/*` (course-based ownership + enrollment) (verified)
- `tests/integration/scorm/*` (ContentAttempt + CourseContent path) (verified)
- `tests/integration/department-resources/*` (course list shape) (verified)
- `tests/unit/*` (type guards, validation) (verified)

Scripts (migration/data seeding):
- `scripts/create-master-department.js` (no change) (verified)
- Add: `scripts/migrate-classlevel-to-programlevel.js` (verified)
- Add: `scripts/migrate-content-to-coursecontent.js` (verified)
- Add: `scripts/migrate-scormattempt-to-contentattempt.js` (verified)
- Add: `scripts/migrate-teacherid-to-instructorid.js` (verified)
- Add: `scripts/migrate-enrollments.js` (verified)

## Phase 2: Schema/Model Migration
Status: ✅ completed
Implement Mongoose schemas to match the new types:
- Add `ProgramLevel`, `ProgramEnrollment`, `Class`, `ClassEnrollment`, `Course`, `CourseContent`, `CourseEnrollment`, `ContentAttempt` models. (verified)
- Update existing models:
  - Replace `ClassLevel` usage with `ProgramLevel` where applicable. (verified)
  - Attach `CourseContent` to `Course`; remove direct `ScormPackage`/`CustomContent` attachments from Program/Class. (verified)
  - Add `globalStatus` to Learner schema; plan deprecation of old flags. (verified)

Deliverables:
- New model files (verified)
- Updated model files (verified)
- Indexes for enrollment and attempt uniqueness (verified)

## Phase 3: Data Migration Scripts
Status: ⚠️ partial (see line items)
Create one-time scripts to migrate existing data:
1) **ProgramLevel**
   - Convert existing `ClassLevel` documents to `ProgramLevel` scoped to Program. (verified)
2) **Courses**
   - Create `Course` docs for existing subjects/units as needed. (verified)
3) **CourseContent**
   - Create `CourseContent` rows for each existing custom content + SCORM package. (verified)
4) **Enrollments**
   - Seed `ProgramEnrollment` and `CourseEnrollment` from current learner-class/program associations. (not verified)
5) **Attempts**
   - Migrate SCORM attempts to `ContentAttempt` with `contentType='scorm'`. (verified)

Deliverables:
- Migration scripts in `scripts/` (verified)
- Dry-run and verification mode for each script (not verified)

### Phase 3.1: Mapping Files (Required Inputs)
Status: ✅ completed
Create mapping files to drive the migration scripts:
- `lms_node_devdocs/migrations/classlevel-to-programlevel.map.json`
  - Maps `ClassLevel` ids → `{ programId, order, name }` (verified)
- `lms_node_devdocs/migrations/scorm-to-coursecontent.map.json`
  - Maps `ScormPackage` ids → `CourseContent` ids for attempt migration (verified)

Deliverables:
- Sample mapping files checked into `lms_node_devdocs/migrations/` (verified)
- Minimal validation tests to ensure JSON files are present and parseable (verified)

## Phase 4: API/Controller Refactor
Status: ✅ completed
Update API endpoints and controllers to use new entities:
- Learner progress endpoints should aggregate:
  - `ProgramEnrollment` + `CourseEnrollment` + `ContentAttempt` (verified)
- Replace ClassLevel-based filters with ProgramLevel. (verified)
- Update custom content/SCORM endpoints to resolve CourseContent. (verified)
- Ensure Course completion updates ProgramEnrollment completion. (verified)

Deliverables:
- Updated controllers (verified)
- Updated validators (verified)
- New endpoints for ProgramLevel, Course, CourseContent if needed (verified)

Phase 4 status notes:
- ✅ ProgramLevel/Course/CourseContent endpoints added. (verified)
- ✅ Content rendering and progress now use CourseContent. (verified)
- ✅ SCORM runtime syncs to ContentAttempt. (verified)
- ✅ Enrollment endpoints completed. (verified)
- ✅ Reporting endpoints completed. (verified)
- ✅ Course completion → ProgramEnrollment update completed. (verified)

### Phase 4.1: Contract Alignment
Status: ✅ completed
After refactors:
- Review all `*-contract.md` docs for current shapes/paths/roles. (verified)
- Add any missing contract docs for new endpoints (ProgramLevel/Course/CourseContent). (verified)
- Append a “Changes (Phase 4)” section to each updated contract. (verified)

### Phase 4.2: Carryover Next Steps (from Phases 0–4.1)
Status: ⚠️ partial (see line items)
- Add enrollment data migration script(s) for Program/Class/Course enrollments. (verified)
- Add dry-run + verification mode for migration scripts. (verified)
- Update learner progress and reporting endpoints to use enrollments + content attempts. (verified)
- Ensure course completion updates ProgramEnrollment completion status. (verified)
- Decide ScormAttempt deprecation path and update runtime/reporting endpoints to use ContentAttempt where appropriate. (not verified)
- Ensure CourseContent is created/linked for SCORM upload + content flows. (verified)
- Update Swagger docs (SCORM + exams) to reference Course/ProgramLevel fields. (verified)
- Complete contract alignment + append “Changes (Phase 4)” sections to all contract docs. (verified)

## Phase 5: Test Migration
Status: ✅ completed
Update integration and unit tests:
- Replace `ClassLevel` fixtures with `ProgramLevel`. (verified)
- Replace SCORM-only attempt tests with `ContentAttempt` (runtime sync assertions). (verified)
- Add tests for:
  - Multi-program enrollment (verified in `tests/integration/academics/enrollments.test.ts`)
  - Course completion deriving program completion (verified in `tests/integration/academics/enrollments.test.ts`)
  - Class progress derived by ProgramLevel courses (verified in `tests/integration/instructors/phase3-teacher-classes-dashboard.test.ts`)

Deliverables:
- Green targeted test suites (verified: `tests/integration/academics/enrollments.test.ts`, `tests/integration/instructors/phase3-teacher-classes-dashboard.test.ts`, `tests/integration/scorm/phase3-runtime-api.test.ts`)
- Updated test helpers and fixtures (verified)

## Phase 6: Cleanup & Deprecation Removal
Status: ⚠️ partial
- Remove legacy fields from Learner model and related code paths. (verified)
- Standardize person name normalization + display handling in controllers/reports. (verified)
- Remove unused models/endpoints (legacy `/api/v1/scorm/*` mounts). (verified)
 - Update docs and contracts. (verified)

Deliverables:
- Clean compile/test (targeted suites verified; full suite not run)
- Updated docs in `lms_node_devdocs/` (not verified)

## Proposed Order of Execution
1) Types & schemas
2) Data migration scripts
3) Controller/API refactor
4) Tests
5) Cleanup

## Risk Notes
- Unified attempts require careful handling of SCORM CMI data.
- CourseContent introduces indirection; ensure all content lookups go through CourseContent.
- Program completion should be computed from CourseEnrollment (do not store duplicate truth).

## Success Criteria
- Learner can enroll in multiple programs simultaneously.
- Program completion is per-program (no global graduation).
- Course progress and class progress are derived correctly.
- SCORM and custom attempts unified under ContentAttempt.

## Next Steps (Post Phase 4.1)
- In-progress order:
  1) ContentAttempt/SCORM attempt unification ✅ completed
  2) Enrollment endpoints (`ProgramEnrollment`, `ClassEnrollment`, `CourseEnrollment`) ✅ completed
  3) Reporting endpoints for program/course progress ✅ completed
- Remaining:
  - Update academic workflows to use `ProgramLevel` and `Course` (replace `ClassLevel` + `Subject` references).
  - Deprecate and remove legacy collections after migration validation.
