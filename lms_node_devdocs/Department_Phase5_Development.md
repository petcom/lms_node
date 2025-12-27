# Phase 5 — Department Hierarchy & Global Content (Backend Development Plan)

## Scope Items
- [x] Department hierarchy manager (Master admin): tree/list with create top-level/sub, edit, guarded delete; counts per node.
- [x] Department assignment on staff profiles: select scoped department; badges in user tables.
- [x] Content creation/edit (programs/subjects/class levels/SCORM): department select (scoped), `isGlobal` toggle for SCORM; badges in lists.
- [x] Content listing filters: department filter (Master), `isGlobal` filter/badge; scoped visibility for teachers.
- [x] Master templates/global content page: view/download/clone global packages/content for top-level admins.

## Backend Work Breakdown (with status)
1) Departments API (CRUD + counts) — [x] complete
   - Routes `/api/v1/departments` (list/create) and `/api/v1/departments/:id` (get/update/delete); scoped auth and guarded delete; counts included.

2) Department scoping middleware — [x] complete
   - `departmentScope` provides master/top/sub accessible ids; helpers applied to listings.

3) Staff assignment — [x] complete
   - Department selection on admin/teacher create/update with scope validation; department returned in responses.

4) Content models and creation — [x] complete
   - Department defaults to caller; admin may target department on SCORM; `isGlobal` supported.

5) Content listing filters — [x] complete
   - Programs/subjects/class levels accept master-only `department` query; scoped defaults for others.
   - SCORM packages accept master-only `department` query; `isGlobal` filter surfaced and scoped fallbacks retained.

6) Global templates / cloning — [x] complete (endpoint delivered; audit logging TBD)
   - `POST /api/v1/scorm/packages/:id/clone` creates department copy from global packages; logs can be extended later.

7) Counts for hierarchy view — [x] complete
   - Aggregated counts returned on department list/detail.

8) Tests — [x] covered
- Departments CRUD scope + delete guards; programs/subjects/class-level filters; SCORM filter and clone; staff department assignment scenarios via controller validation.

## 2025-12-26 Implementation Notes
- Delivered `/api/v1/departments` CRUD with scope enforcement: Master admin can create top-level; top admin can create sub under self; master department is protected from deletion.
- List/detail payloads now include `counts` `{ staffCount, programCount, subjectCount, classLevelCount, packageCount, globalPackageCount }` for UI badges.
- Deletes are blocked when the department has children, staff, or content (programs/subjects/class levels/SCORM packages).
- Test-only tokens added to support scoped admin personas (`test-top-admin-token`, `test-sub-admin-token`) mapped to deterministic department IDs for integration coverage.

## Next Steps (Phase 5 Backend)
- Staff department assignment: expose department on admin/teacher create/update with scope validation (master can set any, top limited to self/subs); return department in responses.
- Content filters: add subject/class-level filter tests; consider remaining academic listings.
- SCORM: add optional `department` query (master-only) and ensure `isGlobal` filter documented; consider clone endpoint (`POST /api/v1/scorm/packages/:id/clone`) for global-to-dept copies.
- Validation polish: reject invalid `department` query values with 400; add better error messages for scope denials across academic endpoints.
- Audit/logging: log department CRUD and content assignment changes for traceability.

## Tests
- Departments CRUD scope (master/top/sub), guarded delete, create sub under top only — done.
- Programs department filter — done.
- Subjects/class-level filters — pending.
- Staff department assignment — pending.
- SCORM filter/clone — pending.

## API Contracts (delta)
- Departments
  - POST `/api/v1/departments` → 201 with department record; errors on invalid parent/level.
  - GET `/api/v1/departments` → scoped list with counts.
  - GET `/api/v1/departments/:id` → scoped detail.
  - PUT `/api/v1/departments/:id` → rename/code change.
  - DELETE `/api/v1/departments/:id` → only when empty; not allowed for master.

- Staff
  - Admin/Teacher create/update: accept `department` (scoped); respond with `department`.

- Content
  - Programs/Subjects/Class Levels create/update: optional `department` (master only); default caller dept; respond with `department`.
  - SCORM upload/update: optional `department` (admin) else caller dept; `isGlobal` boolean (admin only); respond with `department`, `isGlobal`.

- Filters
  - Programs/Subjects/Class Levels: support `department` query (master only); auto-scope otherwise.
  - SCORM packages: support `department` (master only) and `isGlobal` query; always apply scope + allow globals.

- Clone (proposed)
  - POST `/api/v1/scorm/packages/:id/clone` body `{ department: deptId }` (admin only) → 201 cloned package.

## Data and Migration
- Master Department seeded (`000000000000000000000d00`); existing records backfilled to master (already in place).
- No extra migration required beyond CRUD introduction.

## Logging / Audit
- Log department CRUD, staff department changes, SCORM global/clone actions.

## Performance Considerations
- Department counts via aggregation; add indexes on `department` and `isGlobal` already present.
- Consider caching department list + counts per scope if needed.

## Phase 6 (Admin Experience) Notes
- User management CRUD with audit logs and confirmations.
- Academic structure CRUD continues to use department scoping.
- SCORM registry filters (status/subject/owner) respect department scope + globals.
- Health/metrics: expose `/health` and `/metrics` data; add tiles on UI.
- Permissions matrix UI: surface capabilities; backend already has role/permission mapping, may need an endpoint to expose it.
