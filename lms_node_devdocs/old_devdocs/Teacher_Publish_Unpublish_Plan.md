# Instructor Publish/Unpublish – Phased Implementation Plan

## Phase 1: API wiring and contracts
- Add publish/unpublish routes (`POST /api/v1/scorm/packages/:id/publish`, `/api/v1/scorm/packages/:id/unpublish`) behind `isAuthenticated` + `isInstructorOrAdmin`.
- Implement controller handlers that:
  - Load package by id; 404 if missing or not visible to requesting instructor (admin bypasses visibility check).
  - Idempotent state flip: set `isPublished`/`status` to desired state; if already in that state, return 200 with current doc.
  - Update audit fields (`updatedAt`; optional `publishedBy`, `publishedAt`, `unpublishedBy`, `unpublishedAt`).
  - Return 200 with projected fields: `_id`, `packageId`, `title`, `status`, `isPublished`, `version`, `updatedAt`, `publishedAt`, `publishedBy`, `uploadedBy`.
- Unit/integration tests: happy path publish/unpublish; idempotent calls; 404 for missing/invisible package; 401/403 for auth failures.

## Phase 2: Validation and business constraints
- Add optional guards before publishing:
  - Manifest/launch file presence; block publish if missing → 409.
  - Optional block if package is "in-flight" (e.g., active attempts); return 409.
- Add validation errors → 400 with clear messages; ensure responses are consistent across publish/unpublish.
- Extend tests to cover 409/400 cases and constraint bypass (if `force` is later supported).

## Phase 3: Audit fields and metadata
- Extend `ScormPackage` schema with audit fields (`publishedBy`, `publishedByModel`, `publishedAt`, `lastVisibilityChangeAt` or `unpublishedAt`).
- Ensure projections in responses and populates select minimal fields (name/email/role).
- Backfill audit fields for existing published packages (script or migration) with best-effort data.
- Tests: verify audit fields populated on publish/unpublish and preserved on idempotent calls.

## Phase 4: Side-effects and async jobs
- Fire-and-forget hooks after state change:
  - Recalculate dashboard stats/assignments.
  - Emit telemetry/event (e.g., to logger or queue) for audit trail.
- Ensure handlers remain fast by not awaiting heavy work; guard failures so they don’t affect response.
- Tests: assert hooks are invoked (mocked), but response not blocked by failures.

## Phase 5: Documentation and UI alignment
- Update Swagger/OpenAPI to document publish/unpublish endpoints, auth, responses, and error codes (400/401/403/404/409).
- Align instructor/admin UI to use the new endpoints and reflect idempotent responses.
- Add release notes and operational checklist (e.g., run backfill, review indexes, deploy).
