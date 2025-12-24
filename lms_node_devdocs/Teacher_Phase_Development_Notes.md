# Teacher Endpoint Phases – Development Notes

## Phase 1 (Publish/Unpublish)
- Implemented teacher-scoped publish/unpublish via `/api/v1/teachers/packages/:id/(un)publish` with ownership checks and idempotency.
- Added serializer to return `id` plus publish audit fields.
- Tests: `NODE_ENV=test node ./node_modules/.bin/jest --runInBand tests/integration/teachers/phase1-teacher-packages.test.ts --runTestsByPath --detectOpenHandles` (pass).
- Observations: Cast errors avoided by accepting either `_id` or `packageId`; negative ownership tests intentionally log 404 errors. No schema changes required.

## Phase 2 (Packages & Assignments)

## Phase 3 (Classes & Dashboard)
- Added teacher classes listing with pagination/search, student counts, completion and pass rates derived from student attempts in teacher-owned classes.
- Added dashboard aggregates (classes, students, activePackages, avgCompletion, passRate) scoped to teacher ownership.
- Tests: `NODE_ENV=test node ./node_modules/.bin/jest --runInBand tests/integration/teachers/phase3-teacher-classes-dashboard.test.ts --runTestsByPath --detectOpenHandles` (pass).
- Observations: Class-to-student mapping uses `classLevels` strings; completion/pass rates derived from attempt statuses (`completed|passed`).
## Pending / Thoughts
## Phase 4 (Attempts Listing)
- Added attempts listing with filters (`classId`, `packageId`), pagination, and teacher ownership scoping; returns student names, package titles, status, score, timestamps.
- Tests: `NODE_ENV=test node ./node_modules/.bin/jest --runInBand tests/integration/teachers/phase4-teacher-attempts.test.ts --runTestsByPath --detectOpenHandles` (pass).
- Observations: Package filter resolves either `_id` or `packageId`; class filter rejects non-owned classes with 404. Scores sourced from `scorePercentage` when present.
- Consider adding teacher-facing dashboard/classes/attempts endpoints (Phase 3+ in design doc).
- Assignment due dates are package-level (per design deferral); per-class due dates would need schema support.
