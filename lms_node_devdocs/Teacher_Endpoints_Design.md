# Instructor Endpoints Design (SCORM)

## Objective
Design instructor-facing APIs aligned with the existing SCORM package model to support dashboards, classes, packages, publish controls, assignments, and attempts.

## Auth & Access
- Require instructor or admin JWT; otherwise 401/403.
- Scope all queries to classes/packages the instructor owns or is assigned to.
- For admins, full visibility; for instructors, enforce ownership checks on packages, classes, assignments, and attempts.

## Response Conventions
- Pagination: `items`, `total`, `page`, `pageSize`.
- Identifiers: use `id` (string) in payloads; backend may store `_id`.
- Timestamps: ISO 8601 strings.
- Errors: `{ message, details? }`.

## Endpoints
- **Dashboard** `GET /api/v1/instructors/dashboard`
  - Returns `{ classes: number, learners: number, activePackages: number, avgCompletion: number, passRate: number }`.
  - Data sourced from instructor-scoped classes, assignments, and attempts.

- **Classes** `GET /api/v1/instructors/classes?search=&page=&limit=`
  - Returns `{ items: [{ id, name, learners, completion, passRate }], total, page, pageSize }`.
  - `completion`/`passRate` derived from attempts within the class.

- **Packages** `GET /api/v1/instructors/packages?search=&status=&page=&limit=`
  - Returns `{ items: [{ id, title, status, isPublished, version?, updatedAt, progressPct?, attemptsCount? }], total, page, pageSize }`.
  - `status`: `draft|published`; `progressPct` from aggregated attempts; shape mirrors `/api/v1/scorm/packages` for frontend reuse.

- **Publish** `POST /api/v1/instructors/packages/:id/publish`
  - Idempotent; returns updated package with `status`, `isPublished`, `publishedAt`, `publishedBy`.
  - 404 if not found or not owned; 409 if business rule blocks publish.

- **Unpublish** `POST /api/v1/instructors/packages/:id/unpublish`
  - Idempotent; returns updated package with `status`, `isPublished`, `unpublishedAt`, `unpublishedBy`.

- **Assignments (create)** `POST /api/v1/instructors/assignments/assign`
  - Body: `{ packageId, classIds: string[], dueDate?: ISO }`.
  - Returns `{ success: true, assignmentId }`.
  - Validate instructor owns the package and classes.

- **Assignments (list, optional)** `GET /api/v1/instructors/assignments?classId=&page=&limit=`
  - Returns `{ items: [{ id, packageTitle, classId, className, dueDate?, status? }], total, page, pageSize }`.

- **Attempts** `GET /api/v1/instructors/attempts?classId=&packageId=&page=&limit=`
  - Returns `{ items: [{ id, learnerName, packageTitle, status, score, startedAt?, completedAt? }], total, page, pageSize }`.
  - Filtered to instructor-owned classes and packages.

## Validation & Errors
- 400: invalid or missing `packageId`/`classIds`/pagination params.
- 404: unknown package, class, or assignment in instructor scope.
- 409: publish/unpublish blocked by business rules (e.g., archived package).
- 500: unexpected errors.

## Behavioral Notes
- Publish/unpublish should be fast; defer heavy stats recomputation to async jobs.
- Ownership: instructors can only publish/assign packages they uploaded or are explicitly allowed to use; classes must belong to the instructor.
- Attempts list must honor the same scoping rules.

## Data Alignment
- Reuse SCORM package shape from `/api/v1/scorm/packages` for publish/unpublish responses (includes `status`, `isPublished`, audit fields).
- Map backend `_id` to `id` in instructor payloads; keep ISO timestamps.

## Testing & Fixtures
- Provide fixtures with: two packages (one draft, one published), two classes, one assignment, and several attempts across classes with varied statuses/scores to stabilize frontend tests.
- Cover auth failures (401/403), ownership failures (404), and validation errors (400) in integration tests.

## Open Questions
- Should per-class due dates be supported now or deferred?
- Any caps on page size (e.g., max 100)?
- Do instructors need archived package visibility, or hide by default?

## Development Phases
- Phase 1: Publish/Unpublish
  - Add instructor-scoped publish/unpublish endpoints mapped to SCORM package model.
  - Enforce ownership (instructor uploader) and idempotency; return unified package shape.
  - Integration tests for publish/unpublish happy paths, idempotency, and auth/ownership failures.

- Phase 2: Packages & Assignments
  - Implement instructor packages listing with pagination/search/status filters and progress/attempt counts.
  - Implement assignment creation endpoint (packageId + classIds + optional dueDate) with ownership validation.
  - (Optional) Assignment listing endpoint with pagination and due dates.
  - Fixtures: draft/published packages, classes, one assignment.

- Phase 3: Classes & Dashboard
  - Instructor classes listing with completion/passRate aggregates.
  - Dashboard aggregates (classes, learners, activePackages, avgCompletion, passRate) scoped to instructor.
  - Aggregate queries optimized for typical class sizes; cache if needed.

- Phase 4: Attempts & Filtering
  - Attempts listing with filters (classId, packageId), pagination, and ownership scoping.
  - Include status, score, startedAt, completedAt; align with SCORM attempt model.
  - Integration tests for filtering and auth/ownership boundaries.

- Phase 5: Hardening & DX
  - Validation/error shape enforcement across endpoints (400/404/409 patterns).
  - Rate limiting, logging, and performance review; move heavy recompute async.
  - Expand fixtures to cover edge cases (empty states, mixed statuses) and stabilize frontend tests.
