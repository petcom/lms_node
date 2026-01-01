# Instructor Endpoint Phases – Development Notes

## Phase 1 (Publish/Unpublish)
- Implemented instructor-scoped publish/unpublish via `/api/v1/instructors/packages/:id/(un)publish` with ownership checks and idempotency.
- Added serializer to return `id` plus publish audit fields.
- Tests: `NODE_ENV=test node ./node_modules/.bin/jest --runInBand tests/integration/instructors/phase1-instructor-packages.test.ts --runTestsByPath --detectOpenHandles` (pass).
- Observations: Cast errors avoided by accepting either `_id` or `packageId`; negative ownership tests intentionally log 404 errors. No schema changes required.

## Phase 2 (Packages & Assignments)

## Phase 3 (Classes & Dashboard)
- Added instructor classes listing with pagination/search, learner counts, completion and pass rates derived from learner attempts in instructor-owned classes.
- Added dashboard aggregates (classes, learners, activePackages, avgCompletion, passRate) scoped to instructor ownership.
- Tests: `NODE_ENV=test node ./node_modules/.bin/jest --runInBand tests/integration/instructors/phase3-instructor-classes-dashboard.test.ts --runTestsByPath --detectOpenHandles` (pass).
- Observations: Class-to-learner mapping uses `classLevels` strings; completion/pass rates derived from attempt statuses (`completed|passed`).
## Pending / Thoughts
## Phase 4 (Attempts Listing)
- Added attempts listing with filters (`classId`, `packageId`), pagination, and instructor ownership scoping; returns learner names, package titles, status, score, timestamps.
- Tests: `NODE_ENV=test node ./node_modules/.bin/jest --runInBand tests/integration/instructors/phase4-instructor-attempts.test.ts --runTestsByPath --detectOpenHandles` (pass).
- Observations: Package filter resolves either `_id` or `packageId`; class filter rejects non-owned classes with 404. Scores sourced from `scorePercentage` when present.
- Consider adding instructor-facing dashboard/classes/attempts endpoints (Phase 3+ in design doc).
- Assignment due dates are package-level (per design deferral); per-class due dates would need schema support.
