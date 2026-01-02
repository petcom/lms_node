# Class-Course-Program Inventory Report

## Purpose
Capture baseline references for the Class → ProgramLevel, Subject → Course, and ScormAttempt → ContentAttempt migrations.

## Baseline Snapshot
- Scope: repository scan for naming and schema references.
- Date: 2026-01-01

## Collection Names (Final)
- `programlevels`
- `classes`
- `courses`
- `coursecontents`
- `courseenrollments`
- `contentattempts`

## Usage Inventory

### ClassLevel / classLevels / currentClassLevel
Files with references:
- `config/ensureMasterDepartment.ts`
- `controller/academics/classLevelCtrl.ts`
- `controller/academics/departmentCtrl.ts`
- `controller/departmentResources/departmentResourcesCtrl.ts`
- `controller/instructors/instructorPackageCtrl.ts`
- `controller/learners/learnersCtrl.ts`
- `controller/scorm/scormPackageCtrl.ts`
- `controller/scorm/scormReportCtrl.ts`
- `model/Academic/ClassLevel.ts`
- `model/Academic/Exam.ts`
- `model/Academic/ExamResults.ts`
- `model/Scorm/ScormPackage.ts`
- `model/Staff/Admin.ts`
- `routes/academics/classLevel.ts`
- `tests/integration/academics/classlevels-scope-filter.test.ts`
- `tests/integration/academics/program-levels-courses.test.ts`
- `tests/integration/department-resources/department-resources.test.ts`
- `tests/integration/instructors/phase2-teacher-packages-assignments.test.ts`
- `tests/integration/instructors/phase3-teacher-classes-dashboard.test.ts`
- `tests/integration/instructors/phase4-teacher-attempts.test.ts`
- `tests/integration/instructors/phase5-teacher-assignments-list.test.ts`
- `types/models.ts`
- `types/scorm.ts`

### Learner program references
- No `program` field found on `model/Academic/Learner.ts`.
- `types/models.ts` includes `program` references on academic entities (Program, ProgramLevel, enrollments, courses).

### scormProgress / ScormAttempt
Files with references:
- `controller/content/contentCtrl.ts`
- `controller/instructors/instructorPackageCtrl.ts`
- `controller/scorm/scormAttemptCtrl.ts`
- `controller/scorm/scormContentCtrl.ts`
- `controller/scorm/scormPlayerCtrl.ts`
- `controller/scorm/scormReportCtrl.ts`
- `controller/scorm/scormRuntimeCtrl.ts`
- `model/Scorm/ScormAttempt.ts`
- `model/Scorm/ScormPackage.ts`
- `model/Academic/ContentAttempt.ts`
- `routes/scorm/scormSwagger.ts`
- `utils/scorm/completionCalculator.ts`
- `utils/scorm/contentAttemptSync.ts`
- `tests/integration/scorm/phase2-api.test.ts`
- `tests/integration/scorm/phase3-runtime-api.test.ts`
- `tests/integration/instructors/phase2-teacher-packages-assignments.test.ts`
- `tests/integration/instructors/phase3-teacher-classes-dashboard.test.ts`
- `tests/integration/instructors/phase4-teacher-attempts.test.ts`
- `types/scorm.ts`
- `config/swagger.ts`
- `scripts/migrate-scormattempt-to-contentattempt.js`

### Exam / custom content attachments
Files with references:
- `controller/academics/examsCtrl.ts`
- `controller/academics/examResults.ts`
- `controller/academics/questionsCtrl.ts`
- `controller/content/contentCtrl.ts`
- `controller/departmentResources/departmentResourcesCtrl.ts`
- `controller/learners/learnersCtrl.ts`
- `controller/staff/adminCtrl.ts`
- `model/Academic/Exam.ts`
- `model/Academic/ExamResults.ts`
- `model/Academic/CourseContent.ts`
- `model/Academic/ContentAttempt.ts`
- `model/Content/CustomContent.ts`
- `routes/academics/examRoutes.ts`
- `routes/academics/examResultsRoutes.ts`
- `routes/content/contentRouter.ts`
- `routes/learners/learnerRouter.ts`
- `routes/staff/adminRouter.ts`
- `tests/integration/academics/program-levels-courses.test.ts`
- `tests/integration/content/content-v1.test.ts`
- `tests/integration/department-resources/department-resources.test.ts`
- `validators/academicValidation.ts`
- `validators/contentValidation.ts`
- `validators/learnerValidation.ts`

## Mapping Table Reference
The old → new field mapping lives in:
- `lms_node_devdocs/Class-Course-Program_Migration_Plan.md`
  - Section: "Old → New Field Mapping (Concrete)"

## Notes
- This report is intended to be updated as refactors remove ClassLevel/ScormAttempt references.
