# Teacher Publish/Unpublish Endpoints

## Summary
Add explicit publish/unpublish endpoints for SCORM packages so teachers/admins can control visibility without generic updates. Endpoints should be authenticated, idempotent, and enforce ownership/visibility, with clear errors and optional async side-effects.

## Requirements
- **Auth**: Require Bearer token with role `teacher` or `admin`; return 401 if missing/invalid token, 403 if role not allowed.
- **Existence/Ownership**: 404 if package does not exist or is not visible to the requesting teacher (e.g., teacher not owner/uploader and lacks admin role).
- **Action**: Flip persisted publish flag and status (e.g., `isPublished` true/false and `status` `published`/`draft`); update timestamps/audit fields.
- **Idempotency**: Re-publishing an already published package returns 200 with current state; same for unpublish when already draft.
- **Constraints (optional)**: Optionally block publish if required launch files/manifest missing or package is in-flight (e.g., active attempts); return 409 in these cases.
- **Response**: 200 with updated package object (id, title, status, isPublished, version, updatedAt, publisher info if available). 400 on validation errors; 409 on business-rule violations.
- **Side Effects**: Optionally trigger async recalculation of dashboard stats/assignments; do not block the request.

## Proposed API
- **POST /api/v1/scorm/packages/:id/publish**
  - Auth: teacher/admin.
  - Body: optional `{ force?: boolean }` if we later allow bypassing some checks.
  - Behavior: set `isPublished = true`, `status = 'published'`, set `publishedBy` (teacher/admin id + role) and `publishedAt = now`.
  - Idempotent: if already published, return 200 with current state.
  - Errors: 401/403 auth; 404 not found/unauthorized access; 409 if constraints fail.

- **POST /api/v1/scorm/packages/:id/unpublish**
  - Auth: teacher/admin.
  - Behavior: set `isPublished = false`, `status = 'draft'`, set `unpublishedBy` + `unpublishedAt` (or update `publishedBy` to reflect last change), `updatedAt = now`.
  - Idempotent: if already draft/unpublished, return 200 with current state.
  - Errors: same pattern as publish.

## Data Model Additions (optional)
- Add audit fields to `ScormPackage`:
  - `publishedBy: ObjectId refPath ['Admin','Teacher']`
  - `publishedByModel: 'Admin' | 'Teacher'`
  - `publishedAt: Date`
  - `lastVisibilityChangeAt: Date`
- Ensure `status` and `isPublished` remain consistent (published => true/`published`; draft => false/`draft`).

## Controller Logic
1. **Auth/Role**: Use `isAuthenticated()` + `isTeacherOrAdmin` middleware.
2. **Lookup**: Find package by id; if not found return 404. If user is teacher and not uploader/owner (or otherwise not allowed), also return 404 to avoid information leakage.
3. **Constraints** (optional now, pluggable later):
   - Validate manifest/launch files exist before publishing; if missing, 409 with message.
   - Optionally block unpublish if there are active attempts in progress.
4. **Idempotency**: If desired state equals current state, return 200 with current package.
5. **Update**: Set `isPublished`/`status`, update audit fields (`publishedBy`, `publishedAt` or `unpublishedBy`, `unpublishedAt`, `updatedAt`). Save the package.
6. **Response**: Return 200 with filtered package fields: `_id`, `packageId`, `title`, `version`, `status`, `isPublished`, `updatedAt`, `publishedAt`, `publishedBy` (projected), `uploadedBy`.
7. **Side Effects**: Fire-and-forget job to recalc stats/assignments; do not await.

## Routing
- Add routes in `routes/scorm/scormPackageRoutes.ts`:
  - `POST /:id/publish`
  - `POST /:id/unpublish`
  - Both behind `isAuthenticated()` and `isTeacherOrAdmin`.

## Tests
- Integration tests (phase2 scope):
  - Publish sets `isPublished=true`, `status='published'`, returns 200 with fields.
  - Unpublish sets `isPublished=false`, `status='draft'`, returns 200.
  - Idempotent publish when already published returns 200 and unchanged state.
  - 404 when package does not exist or teacher lacks visibility.
  - 401/403 when missing/invalid role.
  - Optional 409 when manifest missing/constraint fails.

## Future Considerations
- Hook into UI to toggle publish state from teacher/admin dashboard.
- Emit telemetry/event for publish/unpublish for auditing.
- Add rate limiting if needed to prevent rapid flipping.
