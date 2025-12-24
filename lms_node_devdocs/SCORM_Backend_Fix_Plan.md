# SCORM Backend Fix Plan (2025-12-23)

## Context
- GET /api/v1/scorm/packages returns 500 due to `StrictPopulateError` on `uploadedBy`; controller populates `uploadedBy` while schema lacks that path, so package lists for students/teachers are broken.
- SCORM player iframe still placeholder; runtime commit/suspend/resume and telemetry are not wired to backend runtime endpoints and launch data is unstable, so progress syncing is blocked.

## Goals
- Restore SCORM package listing/detail APIs without populate errors and with stable author metadata for UI.
- Enable runtime wiring so the player can commit/suspend/resume attempts and report telemetry reliably.

## Workstream A: Fix packages API 500 (populate)
1) Confirm current failure: hit GET /api/v1/scorm/packages and GET /api/v1/scorm/packages/:id to see `StrictPopulateError` on `uploadedBy`. **Status: pending re-check after fix**
2) Source of mismatch:
   - Controller populates `uploadedBy` in list/detail ([controller/scorm/scormPackageCtrl.ts#L162-L210](controller/scorm/scormPackageCtrl.ts#L162-L210), [controller/scorm/scormPackageCtrl.ts#L212-L250](controller/scorm/scormPackageCtrl.ts#L212-L250)). **Status: analyzed**
   - Upload handler writes `uploadedBy` ([controller/scorm/scormPackageCtrl.ts#L55-L110](controller/scorm/scormPackageCtrl.ts#L55-L110)). **Status: aligned**
   - Schema has `createdBy` but no `uploadedBy` ([model/Scorm/ScormPackage.ts#L125-L155](model/Scorm/ScormPackage.ts#L125-L155)), hence strict populate error. **Status: fixed (schema updated)**
3) Decision options (pick one and apply consistently):
   - Preferred: add `uploadedBy` to schema as `ObjectId` ref to the actor model (likely `Staff` or `User`), mirror `createdBy` indexing; keep `createdBy` if it has meaning (assignment owner) or deprecate. **Status: implemented with refPath + model hint**
   - Alternative: drop `uploadedBy` usage and reuse `createdBy` in controller/UI/tests. **Status: not chosen**
4) Implementation steps:
   - Update schema, TypeScript types, and indexes; ensure `strictPopulate` succeeds. **Status: done**
   - Align controller populate fields to chosen path; add `select` projection (name/email/role) to avoid heavy loads. **Status: done (with model hint fallback)**
   - Backfill existing documents (set `uploadedBy = createdBy` where missing) via migration script or one-off update. **Status: pending**
   - Update tests that seed packages with `uploadedBy` ([tests/integration/scorm/phase2-api.test.ts](tests/integration/scorm/phase2-api.test.ts)). **Status: pending**
5) Validation:
   - Run targeted integration tests for SCORM packages and hit the endpoints to confirm 200 + populated author. **Status: pending**
   - Watch logs for removal of `StrictPopulateError` and duplicate index warnings (clean up double indexes if found while touching the schema). **Status: pending**

## Workstream B: Wire SCORM runtime/player
1) Baseline audit:
   - Identify current runtime endpoints (launch data, commit, suspend, resume, initialize/terminate) and their contracts; confirm routes in `routes/scorm` and controllers.
   - Verify what the UI currently calls (player iframe load + pending runtime API calls) and required payloads.
2) Stabilize launch data:
   - Ensure launch endpoint returns package metadata, attempt id, learner id, SCO entry point, and runtime configuration (version, mastery score, tracking flags) in a stable shape.
   - Cache or sign launch URLs if needed; handle resume token/launch parameters.
3) Implement runtime handlers:
   - Commit: persist CMI data, progress, and scores; upsert attempt records; emit telemetry events.
   - Suspend/Resume: store `suspend_data`, lesson location/status, and restore on resume.
   - Attempt lifecycle: create attempt on launch, close on terminate/complete; enforce max attempts from package settings.
4) Player integration tasks:
   - Update UI player to call runtime endpoints instead of placeholders; ensure error handling and retry/backoff around commit.
   - Hook telemetry to `scormLogger` or equivalent so backend receives page-level interactions/time-in-session.
5) Validation:
   - Manual flow: launch → navigate SCO → commit → suspend → resume → complete; verify database state updates (attempt record, stats) and responses are 200.
   - Add/expand integration tests for runtime endpoints to prevent regressions.

## Deliverables
- Schema/controller/test changes that eliminate `StrictPopulateError` and return author info for packages.
- Runtime endpoint and player wiring that support commit/suspend/resume with persisted attempt state and telemetry.
- Validation notes (tests run, manual checks) captured when implemented.

## Next Steps (immediate)
1) Verify fixes: restart dev server, hit GET /api/v1/scorm/packages and /api/v1/scorm/packages/:id to ensure 200 responses with populated author fields and no strict populate warnings.
2) Data hygiene: add a small migration/backfill to set `uploadedBy = createdBy` and `uploadedByModel` based on known roles for existing package documents.
3) Tests: update SCORM integration tests/seeds to include `uploadedBy` + `uploadedByModel`, and add assertions that list/detail endpoints return author projection.
4) Populate model resolution: consider removing the hard-coded `model: 'Teacher'` in populates once refPath data is backfilled; otherwise enforce a single author model in the contract and document it.
5) Runtime wiring: proceed with Workstream B—stabilize launch data shape, implement commit/suspend/resume handlers, and hook telemetry to the player; add integration coverage for the runtime endpoints.
6) Test harness fixes: ensure `JWT_SECRET` is set in test setup and skip morgan in `NODE_ENV=test` to avoid `stream.write` errors during supertest runs.
7) SCORM test fixtures: provide full required package fields (launchUrl, entryPoint, manifestData, filePath, fileSize, createdBy) in integration seeds to avoid validation failures.
8) Index hygiene: remove duplicate index definitions for `expiresAt` (token models) and SCORM attempt indexes (`student/package/attemptNumber`, `package/status`) to silence warnings.
