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
- Freeze new feature work.
- Export list of all usages of:
  - `ClassLevel`, `classLevels`, `currentClassLevel`
  - `program` on Learner
  - `scormProgress` and SCORM attempt-specific fields
  - `Exam`/custom content attachments
- Decide final collection names for:
  - `programLevels`, `classes`, `courses`, `courseContents`, `courseEnrollments`, `contentAttempts`

Deliverables:
- Inventory report of impacted files
- Mapping table (old → new fields)

## Phase 1: Type System Update (types.ts)
Update `types/models.ts` to reflect the ERDs:
- **Learner**
  - Add `globalStatus: 'active' | 'inactive'`
  - Remove or deprecate: `isGraduated`, `isPromoted*`, `currentClassLevel`, `classLevels`, `academicYear`, `yearGraduated`, `examResults`, `scormProgress`
- **Program**
  - Ensure `department` is required
- **ProgramLevel** (new)
- **ProgramEnrollment** (new)
- **Class** (new, cohort)
- **ClassEnrollment** (new)
- **Course** (new)
- **CourseContent** (new, unified)
- **CourseEnrollment** (new)
- **ContentAttempt** (new, unified)

Deliverables:
- Updated `types/models.ts`
- Deprecated fields documented in comments or a migration notes section

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
Update or add type definitions in:
- `types/models.ts`
- `types/auth.ts` (if role or enrollment types are referenced)
- `types/express.d.ts` (if request typings reference learner fields)

Add new interfaces:
- `IProgramLevel`
- `IProgramEnrollment`
- `IClass`
- `IClassEnrollment`
- `ICourse`
- `ICourseContent`
- `ICourseEnrollment`
- `IContentAttempt`

Deprecate/remove fields on:
- `ILearner` (replace with `ILearner`; remove per-program/per-class fields listed above)

### Phase 2: Naming Migration (Learner/Instructor → Learner/Instructor)
Key rename targets:
- Types/interfaces: `ILearner` → `ILearner`, `IInstructor`/`IStaff` → `IInstructor` (if split)
- Collections: `learners` → `learners`, `instructors` → `instructors`
- Enums/roles: `learner` → `learner`, `instructor` → `instructor`
- API paths: `/learners/*` → `/learners/*`, `/instructors/*` → `/instructors/*`
- Request/response payload fields: `learnerId` → `learnerId`, `instructorId` → `instructorId`

### Phase 2 Prep: Fuller Checklist (Per File/Area)
Models to add:
- `model/Academic/ProgramLevel.ts`
- `model/Academic/Class.ts`
- `model/Academic/Course.ts`
- `model/Academic/CourseContent.ts`
- `model/Academic/ProgramEnrollment.ts`
- `model/Academic/ClassEnrollment.ts`
- `model/Academic/CourseEnrollment.ts`
- `model/Academic/ContentAttempt.ts`

Models to update or retire:
- `model/Academic/ClassLevel.ts` (replace with ProgramLevel)
- `model/Academic/Learner.ts` (remove legacy fields, add globalStatus)
- `model/Academic/Subject.ts` (replace program/classLevel links with Course)
- `model/Scorm/ScormAttempt.ts` (migrate to ContentAttempt)

Controllers likely impacted:
- `controller/learners/learnersCtrl.ts`
- `controller/academics/classLevelCtrl.ts` (replace with ProgramLevel)
- `controller/academics/programCtrl.ts`
- `controller/academics/subjectCtrl.ts`
- `controller/scorm/scormAttemptCtrl.ts`
- `controller/scorm/scormPackageCtrl.ts`
- `controller/departmentResources/departmentResourcesCtrl.ts` (content list)
- `controller/instructors/instructorPackageCtrl.ts` (course-level ownership)

Routes likely impacted:
- `routes/academics/classLevel.ts` (replace with ProgramLevel routes)
- `routes/academics/program.ts`
- `routes/academics/subject.ts`
- `routes/scorm/scormAttemptRoutes.ts`
- `routes/scorm/scormPackageRoutes.ts`
- `routes/departmentResources/departmentResourcesRouter.ts`

Validators to update/add:
- `validators/academicValidation.ts` (programLevel/course/courseContent)
- `validators/departmentResourcesValidation.ts` (content filters)
- `validators/staffValidation.ts` (if staff-course ownership fields change)

Tests to update/add:
- `tests/integration/instructors/*` (course-based ownership + enrollment)
- `tests/integration/scorm/*` (ContentAttempt + CourseContent path)
- `tests/integration/department-resources/*` (course list shape)
- `tests/unit/*` (type guards, validation)

Scripts (migration/data seeding):
- `scripts/create-master-department.js` (no change)
- Add: `scripts/migrate-classlevel-to-programlevel.js`
- Add: `scripts/migrate-content-to-coursecontent.js`
- Add: `scripts/migrate-scormattempt-to-contentattempt.js`
- Add: `scripts/migrate-teacherid-to-instructorid.js`

## Phase 2: Schema/Model Migration
Implement Mongoose schemas to match the new types:
- Add `ProgramLevel`, `ProgramEnrollment`, `Class`, `ClassEnrollment`, `Course`, `CourseContent`, `CourseEnrollment`, `ContentAttempt` models.
- Update existing models:
  - Replace `ClassLevel` usage with `ProgramLevel` where applicable.
  - Attach `CourseContent` to `Course`; remove direct `ScormPackage`/`CustomContent` attachments from Program/Class.
  - Add `globalStatus` to Learner schema; plan deprecation of old flags.

Deliverables:
- New model files
- Updated model files
- Indexes for enrollment and attempt uniqueness

## Phase 3: Data Migration Scripts
Create one-time scripts to migrate existing data:
1) **ProgramLevel**
   - Convert existing `ClassLevel` documents to `ProgramLevel` scoped to Program.
2) **Courses**
   - Create `Course` docs for existing subjects/units as needed.
3) **CourseContent**
   - Create `CourseContent` rows for each existing custom content + SCORM package.
4) **Enrollments**
   - Seed `ProgramEnrollment` and `CourseEnrollment` from current learner-class/program associations.
5) **Attempts**
   - Migrate SCORM attempts to `ContentAttempt` with `contentType='scorm'`.

Deliverables:
- Migration scripts in `scripts/`
- Dry-run and verification mode for each script

### Phase 3.1: Mapping Files (Required Inputs)
Create mapping files to drive the migration scripts:
- `lms_node_devdocs/migrations/classlevel-to-programlevel.map.json`
  - Maps `ClassLevel` ids → `{ programId, order, name }`
- `lms_node_devdocs/migrations/scorm-to-coursecontent.map.json`
  - Maps `ScormPackage` ids → `CourseContent` ids for attempt migration

Deliverables:
- Sample mapping files checked into `lms_node_devdocs/migrations/`
- Minimal validation tests to ensure JSON files are present and parseable

## Phase 4: API/Controller Refactor
Update API endpoints and controllers to use new entities:
- Learner progress endpoints should aggregate:
  - `ProgramEnrollment` + `CourseEnrollment` + `ContentAttempt`
- Replace ClassLevel-based filters with ProgramLevel.
- Update custom content/SCORM endpoints to resolve CourseContent.
- Ensure Course completion updates ProgramEnrollment completion.

Deliverables:
- Updated controllers
- Updated validators
- New endpoints for ProgramLevel, Course, CourseContent if needed

### Phase 4.1: Contract Alignment
After refactors:
- Review all `*_Contract.md` docs for current shapes/paths/roles.
- Add any missing contract docs for new endpoints (ProgramLevel/Course/CourseContent).
- Append a “Changes (Phase 4)” section to each updated contract.

## Phase 5: Test Migration
Update integration and unit tests:
- Replace `ClassLevel` fixtures with `ProgramLevel`.
- Replace SCORM-only attempt tests with `ContentAttempt`.
- Add tests for:
  - Multi-program enrollment
  - Course completion deriving program completion
  - Class progress derived by ProgramLevel courses

Deliverables:
- Green test suite
- Updated test helpers and fixtures

## Phase 6: Cleanup & Deprecation Removal
- Remove legacy fields from Learner model and related code paths.
- Remove unused models/endpoints.
- Update docs and contracts.

Deliverables:
- Clean compile/test
- Updated docs in `lms_node_devdocs/`

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
