# Teacher Endpoint Phases – Development Notes

## Phase 1 (Publish/Unpublish)
- Implemented teacher-scoped publish/unpublish via `/api/v1/teachers/packages/:id/(un)publish` with ownership checks and idempotency.
- Added serializer to return `id` plus publish audit fields.
- Tests: `NODE_ENV=test node ./node_modules/.bin/jest --runInBand tests/integration/teachers/phase1-teacher-packages.test.ts --runTestsByPath --detectOpenHandles` (pass).
- Observations: Cast errors avoided by accepting either `_id` or `packageId`; negative ownership tests intentionally log 404 errors. No schema changes required.

## Phase 2 (Packages & Assignments)
- Added teacher package listing with pagination, search, status filter, attempt counts, and progressPct derived from attempt aggregation.
- Added assignment creation endpoint `/api/v1/teachers/assignments/assign` with ownership validation on packages and classes, dueDate parsing, and class-level assignments.
- Tests: `NODE_ENV=test node ./node_modules/.bin/jest --runInBand tests/integration/teachers/phase2-teacher-packages-assignments.test.ts --runTestsByPath --detectOpenHandles` (pass).
- Observations: Validation errors (missing packageId/classIds) surface as 400; ownership failures return 404 as designed. ts-jest warns about deprecated `isolatedModules` setting (consider enabling in tsconfig.test.json).

## Pending / Thoughts
- Consider adding teacher-facing dashboard/classes/attempts endpoints (Phase 3+ in design doc).
- Assignment due dates are package-level (per design deferral); per-class due dates would need schema support.
- No git push performed in this environment; commit when ready.
