# Department Access Control Development Report

## Summary
- Added Department model with three-level hierarchy support and seeded a Master Department (default id `000000000000000000000d00`).
- Backfilled existing admins, teachers, programs, subjects, class levels, and SCORM packages to the Master Department.
- Added department references to staff/content schemas (Admin, Teacher, Program, Subject, ClassLevel, ScormPackage) and types.
- Implemented department-aware scope middleware and applied it to SCORM package routes and academic list/detail routes.
- Enabled global-sharing flag on SCORM packages (`isGlobal`) to allow Master/department admins to curate shared items.
- Updated listings and detail endpoints to enforce department scope and allow global packages across departments.
- Allowed teachers to read programs/subjects/class levels within their scoped departments while keeping creates/updates admin-only.

## Changes Made
- New model: `model/Academic/Department.ts`.
- Seeder/backfill: `config/ensureMasterDepartment.ts` invoked during DB connect.
- Scope middleware: `middlewares/departmentScope.ts`; request typing updated.
- Schema updates: Admin, Teacher, Program, Subject, ClassLevel, ScormPackage (added `department`; SCORM added `isGlobal`).
- Controllers updated for department assignment/scope: SCORM packages, programs, subjects, class levels.
- Routes updated to include scope middleware and teacher read access where needed (programs/subjects/class levels, SCORM packages).
- Test update: SCORM package listing integration now seeds master department and associates packages.

## Tests
- `NODE_ENV=test npx jest --runInBand tests/integration/scorm/package-list-filters.test.ts`

## Follow-ups / TODO
- Add department CRUD endpoints (master creates top-level, top-level creates subs) with guards.
- Expand scope enforcement to any remaining content endpoints not yet covered (e.g., exams, year groups) if required.
- Add tests covering department scoping (top-level vs sub vs master) and `isGlobal` visibility.
- Wire UI/API docs for new `department` and `isGlobal` fields on SCORM packages and academic entities.
