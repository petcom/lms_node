# Department Access Control Design

## Goals
- Introduce hierarchical departments to scope visibility of courses, packages, and related academic objects.
- Default-open model: a single Master Department allows all staff to see all content when no sub-structure exists.
- Support three levels for now: Master > Top-Level Department > Sub-Department. Keep schema forward-compatible with deeper trees.
- Ensure staff scoping: Master staff see all; Top-Level staff see all content in that top-level (including its sub-departments if we choose); Sub-Department staff are limited to their sub-department.

## Scope (Phase 1)
- Add a Department model with tree structure (parent ref, level indicator).
- Seed a singleton Master Department.
- Associate content/staff to departments (minimum: SCORM packages, programs, subjects, class levels; optionally year groups/courses if present).
- Adjust read-list endpoints to filter content by the requester’s department scope.
- Keep create/update restricted to existing role gates (admin/teacher) but scoped by department where applicable.

## Department Model (proposed)
- Fields:
  - `name` (string, required, unique per sibling)
  - `code` (string, optional unique slug/short code)
  - `level` (enum: `master`, `top`, `sub` for now; future-safe to add more)
  - `parent` (ObjectId -> Department, nullable for master)
  - `ancestors` (ObjectId[], ordered root->leaf for quick subtree queries)
  - Timestamps
- Constraints:
  - Only one `master` department.
  - `top` departments must have parent = master.
  - `sub` departments must have parent = a top-level department.

## Staff Association
- Add `department` (ObjectId -> Department) to staff models (Admin/Teacher). For Master Admins, set to Master Department.
- Role semantics:
  - Master Admin: role=admin AND department=master → global visibility.
  - Department Admin (if introduced later): role=admin AND department=top/sub → scoped visibility.
  - Teacher: role=teacher AND department set → scoped visibility.

## Content Association
- Add `department` (ObjectId -> Department) to content models:
  - SCORM packages
  - Program
  - Subject
  - ClassLevel
  - (Optional/if needed) Course/YearGroup/etc.
- Write rules:
  - New content created by staff inherits their department by default (unless master creating for another dept via input).
  - For master admins, allow specifying target department when creating content.

## Access Rules (read/list)
- Master staff (department=master): can read all departments and all content.
- Top-Level staff: can read content where `department` = their top-level or any sub-department under it (decide if sub-inclusion is desired; recommended: yes for simplicity and admin oversight).
- Sub-Department staff: can read content where `department` = their sub-department only.
- For SCORM packages listing, apply department filter automatically based on requester scope in addition to existing filters (status/search/pagination).

## Access Rules (write)
- Creation: staff can create content within their own department. Master admins can create for any department.
- Update/delete: allowed only if requester’s department scope includes the content’s department (or master).
- Department CRUD: restricted to master admin; optionally allow top-level admins to create sub-departments under their own top-level.

## API Additions/Changes (proposed)
- Departments endpoints (admin-only unless scoped otherwise):
  - `POST /api/v1/departments` (create; parent required for non-master; master can create top-level; top-level admin can create sub under self if allowed)
  - `GET /api/v1/departments` (list; master sees all; top-level sees self + subs; sub sees self)
  - `GET /api/v1/departments/:id`
  - `PUT /api/v1/departments/:id`
  - `DELETE /api/v1/departments/:id` (guard against deleting master; guard non-empty departments)
- Staff endpoints: allow setting `department` on staff create/update (with validation and scope checks).
- Content endpoints: accept `department` (ObjectId) on create (master only); otherwise default to requester’s department; enforce read filters.

## Data Migration
- Seed Master Department (singleton).
- Backfill existing staff to Master Department (or map to new top-levels if known).
- Backfill existing content to Master Department initially to keep behavior unchanged.

## Authorization Implementation Sketch
- Middleware derives requester scope:
  - If department=master → scope = all.
  - If level=top → scope = {dept=self, children=subs}.
  - If level=sub → scope = {dept=self}.
- For list queries: add `department` filter based on scope (or `$in` of scoped ids for top-level).
- For single fetch/update/delete: ensure resource.department is within scope.

## Open Questions
- Do top-level staff need visibility into their sub-departments? (Assumed yes.) 

--YES (answered by developer)

- Should teachers be able to read subjects/programs/class levels across their top-level’s sub-departments? (Assumed yes.) 

--YES, if a teacher is assigned to the top level, then they should be able to read subjects/programs/class levels accross the department, if assigned to a sub-department, then limit to just those set in the sub-department (answered by developer)

- Any cross-department sharing needed (e.g., master-created shared packages) beyond master scope? If yes, we may add an `isGlobal` flag. 

--YES - Master Admins should be able to curate a list of packages, course-objects, tests - etc, that are available at least as demonstration or template items for all departments to use. And department Admins should be able to do the same for their departments

- Do we need a dedicated “Department Admin” role distinct from master admins? If so, add permission checks accordingly.

-- If Admins have the correct scope, then "Master Admins" should be "Department Admins" of the "Master Department", so is it distinct yes --- if the hierarchy is working does it need to be different - not sure - don't think so.

## Non-Goals (for this change)
- UI changes (will be handled separately).
- Deep hierarchical support beyond three levels (model allows more later but enforcement keeps 3 for now).
- Complex sharing policies; stick to departmental scoping.

## Next Steps / Progress
- [x] Confirm scope answers above.
- [x] Add Department model + seed Master.
- [x] Add department field to staff and core content models; migrate data to Master.
- [x] Implement scope middleware + apply to list/detail endpoints (programs, subjects, class levels, SCORM packages).
- [ ] Add department CRUD endpoints with proper guards (Master → top; top → sub; delete with emptiness checks).
- [ ] Update docs/tests for new scoping behavior (scoping tests beyond SCORM listing still pending).
