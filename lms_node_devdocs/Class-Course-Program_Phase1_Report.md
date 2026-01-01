# Phase 1 Completion Report: Types + Role/Path Updates

## Scope
- Update core types for new ERD entities
- Align role strings and API path conventions
- Refresh contract docs with current role/shape details

## Changes Completed
- Added ERD-aligned interfaces to `types/models.ts` (`IProgramLevel`, `IProgramEnrollment`, `IClass`, `IClassEnrollment`, `ICourse`, `ICourseContent`, `ICourseEnrollment`, `IContentAttempt`).
- Updated role strings in code and docs to `global-admin | staff | learner`.
- Department Resources: staff user responses now include `roles` array; `role` is limited to `global-admin | staff`.
- Contract docs updated with new role strings, staff subtypes, and `passingStyleScore` in department summaries.
- Added migration helper `scripts/migrate-teacherid-to-instructorid.js`.
- Tests setup now drops legacy `teacherId_1` index for local DBs.

## Tests
- `tests/integration/department-resources/department-resources.test.ts`
  - Result: PASS (with local MongoDB; warning about duplicate schema index persists)

## Known Warnings
- Mongoose warns about duplicate schema index on `{ name: 1 }`.
- Jest warns about deprecated `ts-jest` `isolatedModules` config.

## Next Phase
- Implement schema/model changes for new entities.
- Migrate legacy data to new enrollment/content models.
- Update controllers/routes/tests for ProgramLevel/Course/CourseContent.
