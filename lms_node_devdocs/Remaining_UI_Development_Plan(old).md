# Remaining UI Development Plan — Backend Route Design

## Scope
- Define backend routes, payloads, and behaviors needed to support remaining UI items (Phases 6–9).
- Cover CRUD, filtering, pagination, exports, health/metrics tiles, permissions matrix, and logging/auditing.
- Assume existing auth (`Bearer`, role-based), department scoping, and SCORM models remain unchanged unless noted.

## Conventions
- Base path prefix: `/api/v1` (versioned; keep compatibility with existing routes).
- Pagination: `?page=` (1-based), `?limit=` (default 10 or existing default), return `{ items, total, page, pageSize }`.
- Filtering: use query params; multi-select as CSV (e.g., `status=draft,published`).
- Sorting: `?sort=field` and `?order=asc|desc` where applicable.
- Dates: ISO 8601 strings; ranges via `from=` / `to=`.
- IDs: Mongo ObjectId strings.
- Responses: `{ success: boolean, data, message? }`; errors via standard error handler.
- Audit: include `updatedBy`, `updatedByRole`, timestamps; write structured logs for create/update/delete.
- Confirmation UX: destructive actions return `409` with reason when blocked; clients must confirm before calling.

## Phase 6 — Admin Experience
### User Management (Admins/Teachers/Students)
- GET `/users` (admin/master): list with filters `role=admin|teacher|student`, `status=active|suspended|withdrawn`, `department=`; pagination/sort.
- POST `/users` (admin/master): create user; body depends on role; returns created user.
- GET `/users/:id` (admin/master + owner self): detail.
- PUT `/users/:id` (admin/master): update profile fields; scope by department; log changes.
- PATCH `/users/:id/suspend` (admin/master): body `{ reason }`; sets status `suspended` and `suspendedAt/by`.
- PATCH `/users/:id/withdraw` (admin/master): body `{ reason }`; sets status `withdrawn` and `withdrawnAt/by`.
- DELETE `/users/:id` (admin/master): hard delete only if no linked records; otherwise return 409.
- Self-profile: GET `/me`, PUT `/me` (limited fields), PATCH `/me/password` delegates to existing password controller.

### Academic Structure (Programs, Subjects, Class Levels, Terms)
- Extend existing CRUD with audit logging and confirmation responses; no new routes, but add:
  - Query params: `status=` (active/archived), `updatedFrom/updatedTo`.
  - PATCH `/programs/:id/archive` (admin/master): flag archived; block delete when archived=false?
  - Same pattern for subjects, class-levels, terms: `/subjects/:id/archive`, `/class-levels/:id/archive`, `/academic-terms/:id/archive`.

### System SCORM Registry
- GET `/scorm/registry` (admin/master): server-side filtered list across all departments.
  - Filters: `status=draft,published,archived`, `subject=`, `program=`, `owner=` (uploader id), `department=`, `isGlobal=` (bool), `dateFrom/dateTo` (createdAt), `version=`.
  - Returns minimal cards: `{ id, packageId, title, status, isGlobal, department, subject, owner, attemptsCount, lastPublishedAt }`.
- PATCH `/scorm/registry/:id/archive` (admin/master): set `archived=true`, record `archivedBy/At`; block if active assignments exist (return 409 with counts).

### Platform Health Tiles
- GET `/health` (already present): surface uptime/status.
- GET `/metrics` (new or proxy to monitoring): returns summary stats for storage usage, active sessions, error rates.
  - Shape: `{ storage: { usedBytes, quotaBytes? }, sessions: { activeUsers, activeSessions }, errors: { rate1m, rate5m }, timestamp }`.
  - Option: expose `/metrics/raw` for Prometheus; UI uses summarized `/metrics`.

### Permissions Matrix for SCORM
- GET `/scorm/permissions-matrix` (admin/master): returns capabilities per role/department.
  - Shape: `{ roles: ['admin','teacher','student'], permissions: { upload, publish, assign, clone, delete, viewAttempts, viewReports, globalAccess } with booleans }`.
- PATCH `/scorm/permissions-matrix` (admin/master): update policy flags; store centrally (e.g., config collection); audit changes.

### Audit Logging
- POST changes above write audit entries: `{ action, entityType, entityId, actorId, actorRole, before?, after?, reason?, timestamp }`.
- Provide GET `/audit` (admin/master) with filters `entityType`, `actorId`, `action`, `from/to`.

## Phase 7 — Reporting & Exports
### Reports Endpoints
- GET `/reports/student-progress`: filters `student=`, `class=`, `program=`, `package=`, `from/to`, pagination; returns rollups per student+package.
- GET `/reports/package-analytics`: filters `package=`, `subject=`, `program=`, `from/to`; returns aggregates (launches, completions, avgScore, avgTime, passRate).
- GET `/reports/attempts`: detailed attempts with pagination; filters `package=`, `student=`, `status=`, `from/to`.
- GET `/reports/completion-distribution`: histogram buckets for scores/durations; filters `package=`, `class=`, `from/to`.
- GET `/reports/interactions`: SCORM interaction rollups; filters `package=`, `student=`, `from/to`.

### Exports
- POST `/exports` create export jobs; body `{ type: 'student-progress'|'package-analytics'|'attempts'|'interactions', format: 'csv'|'json'|'xlsx', filters: {...} }`.
- GET `/exports/:id` fetch status `{ status: queued|processing|completed|failed, downloadUrl?, error? }`.
- GET `/exports` list user-visible jobs with pagination and filters `type`, `status`, `from/to`.
- Jobs should enqueue background worker; store files (S3/local) with signed URLs; include audit log entry.

### Deep Links
- Provide `link` fields in report responses pointing to detail endpoints with matching filters (e.g., attempts detail link).

## Phase 8 — Quality, A11y, Performance, Mobile (Backend Support)
- Add lightweight `HEAD`/`OPTIONS` where needed for preflight/perf.
- Provide compressed responses (ensure compression middleware enabled).
- Support range/pagination for large tables; indexes for filters (date, package, student, class, department).
- Add rate limits for export/report routes; debounce-friendly (idempotent keys optional).

## Phase 9 — Delivery & Hardening
- Feature flags: config endpoint `GET/PUT /feature-flags` (admin/master) with namespacing (e.g., `scorm.player`, `exports.enabled`).
- Health gating: `/health` + `/metrics` already noted; add `GET /version` returning git SHA/semver for rollback visibility.
- Front-end logging ingest: POST `/client-logs` to capture player/runtime errors; body `{ level, message, context, userAgent, url, userId? }`; rate limit and sample.

## Authz & Scope Rules
- Admin/master can access all; top-level admins scoped to their department tree where applicable; teachers limited to ownership and department scope; students only self-data.
- Export/report endpoints: admins by default; allow teachers to view their own classes/packages if required by product; enforce via departmentScope + ownership checks.
- Permissions matrix can further restrict capabilities (enforced in controllers/services).

## Data Model Notes
- Add `archived` flags to programs, subjects, class levels, terms, SCORM packages.
- User status enum: `active|suspended|withdrawn` with timestamps/reasons.
- Audit collection for write operations; indexes on `entityType`, `actorId`, `createdAt`.
- Exports collection: track job status, owner, filters, format, storage path, error.

## Logging & Metrics
- Log structured events for create/update/delete, exports started/completed/failed, report queries (with filter summary and duration).
- Metrics: counts for exports queued/failed, report latency, DB query time, SCORM play events if instrumented.

## Testing Strategy (Backend)
- Unit: services for filters, permission checks, export builders.
- Integration: endpoints for users CRUD, suspend/withdraw, registry filters, report queries, exports lifecycle, permissions matrix updates.
- E2E (post-merge): critical admin flows (user suspend, archive package, export download).
- Load: baseline for report/export queries; ensure indexes.

## Open Questions
- Should teachers be allowed to request exports for their own classes only? Default to admins; add feature flag.
- Storage provider for exports (S3 vs local) and retention policy.
- Metrics source: expose internal `/metrics` or proxy Prometheus? Confirm shape expected by UI.
- Audit log retention and PII considerations.
