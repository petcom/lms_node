# SCORM Backend Fix Plan (2025-12-23)

## Context
- GET /api/v1/scorm/packages returns 500 due to `StrictPopulateError` on `uploadedBy`; controller populates `uploadedBy` while schema lacks that path, so package lists for students/teachers are broken.
- SCORM player iframe still placeholder; runtime commit/suspend/resume and telemetry are not wired to backend runtime endpoints and launch data is unstable, so progress syncing is blocked.

## Goals
- Restore SCORM package listing/detail APIs without populate errors and with stable author metadata for UI.
- Enable runtime wiring so the player can commit/suspend/resume attempts and report telemetry reliably.

## Workstream A: Fix packages API 500 (populate)
1) Confirm current failure: hit GET /api/v1/scorm/packages and GET /api/v1/scorm/packages/:id to see `StrictPopulateError` on `uploadedBy`.
2) Source of mismatch:
   - Controller populates `uploadedBy` in list/detail ([controller/scorm/scormPackageCtrl.ts#L162-L210](controller/scorm/scormPackageCtrl.ts#L162-L210), [controller/scorm/scormPackageCtrl.ts#L212-L250](controller/scorm/scormPackageCtrl.ts#L212-L250)).
   - Upload handler writes `uploadedBy` ([controller/scorm/scormPackageCtrl.ts#L55-L110](controller/scorm/scormPackageCtrl.ts#L55-L110)).
   - Schema has `createdBy` but no `uploadedBy` ([model/Scorm/ScormPackage.ts#L125-L155](model/Scorm/ScormPackage.ts#L125-L155)), hence strict populate error.
3) Decision options (pick one and apply consistently):
   - Preferred: add `uploadedBy` to schema as `ObjectId` ref to the actor model (likely `Staff` or `User`), mirror `createdBy` indexing; keep `createdBy` if it has meaning (assignment owner) or deprecate.
   - Alternative: drop `uploadedBy` usage and reuse `createdBy` in controller/UI/tests.
4) Implementation steps:
   - Update schema, TypeScript types, and indexes; ensure `strictPopulate` succeeds.
   - Align controller populate fields to chosen path; add `select` projection (name/email/role) to avoid heavy loads.
   - Backfill existing documents (set `uploadedBy = createdBy` where missing) via migration script or one-off update.
   - Update tests that seed packages with `uploadedBy` ([tests/integration/scorm/phase2-api.test.ts](tests/integration/scorm/phase2-api.test.ts)).
5) Validation:
   - Run targeted integration tests for SCORM packages and hit the endpoints to confirm 200 + populated author.
   - Watch logs for removal of `StrictPopulateError` and duplicate index warnings (clean up double indexes if found while touching the schema).

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
