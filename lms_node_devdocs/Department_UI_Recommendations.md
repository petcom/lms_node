# Department UI Recommendations

## Goals
- Let Master Admins manage the department hierarchy (Master → Top-Level → Sub) and shared/global content.
- Let Top-Level admins manage sub-departments under their scope.
- Enforce scoped visibility for teachers while keeping global items discoverable.

## Pages / Flows
1) **Department Hierarchy Manager (Admin)**
   - Tree/list view of departments (Master at root).
   - Actions: create top-level (Master only), create sub-dept (within own top-level), edit name/code, delete (only if empty or after reassigning content/staff).
   - Show counts per node (staff, programs, subjects, class levels, packages) and flags for `isGlobal` content count.
   - Guardrails: prevent deleting Master; prevent deleting non-empty nodes; confirm reassign/move not yet supported (call out future work).

2) **Department Assignment (Staff)**
   - Admin/Teacher profile edit: select department (ObjectId) scoped by current admin’s permissions (Master sees all; top-level admin sees self + subs).
   - Surface current department on profile header and in user tables.

3) **Content Creation/Edit (Programs/Subjects/Class Levels/SCORM Packages)**
   - Add a Department select (ObjectId) for Master Admin; pre-fill & lock to user’s department for others.
   - For SCORM upload: toggle `isGlobal` (visible to Master Admin; default off). Show helper text: “Global packages are visible to all departments.”
   - List/detail pages: display department badge; filter by department where applicable.

4) **Content Listing Filters**
   - For programs/subjects/class levels: auto-scope by user; optional department filter for Master Admin.
   - SCORM packages: filters already support search/status; add department filter (Master-only) and `isGlobal` filter (all roles; only shows global items they can see).

5) **Permissions UX**
   - Hide create buttons for departments from non-authorized roles.
   - When access is denied by scope, show a friendly empty state: “No items in your department scope.”

## API Integration Notes
- Departments API (implemented): CRUD under `/api/v1/departments` with scope enforcement and counts for UI badges.
   - Create: POST `/api/v1/departments` body `{ name, code?, level: 'top'|'sub', parent?: deptId }`; Master can create top; Top can create sub under self. Master department is singleton and not creatable.
   - List: GET `/api/v1/departments` returns a scoped flat list (Master sees all; Top sees self+subs; Sub sees self) with `counts` `{ staffCount, programCount, subjectCount, classLevelCount, packageCount, globalPackageCount }` for each item. Use `?limit=` to control pagination (default 2).
   - Detail: GET `/api/v1/departments/:id` scoped similarly and includes the same `counts` payload.
   - Update: PUT `/api/v1/departments/:id` (rename/code change) scoped; no level/parent change allowed (backend rejects).
   - Delete: DELETE `/api/v1/departments/:id` only if no children/staff/content; Master cannot be deleted.
- Content endpoints now emit `department`:
   - Programs: GET `/api/v1/programs` (admin/teacher view) returns `department`; auto-scoped; Master may filter by `department` if filter is added.
   - Subjects: GET `/api/v1/subjects` similarly scoped and returns `department`.
   - Class levels: GET `/api/v1/class-levels` similarly scoped and returns `department`.
   - SCORM packages: GET `/api/v1/scorm/packages` accepts existing filters plus department scope; response items include `department` and `isGlobal`; `isGlobal` packages are visible to all roles.
- Creation semantics (current backend):
   - Programs/Subjects/Class Levels: department auto-set from creator; Master admin may target a department (future: explicit field).
   - SCORM upload: accepts optional `department` when admin; otherwise defaults to creator’s department; optional `isGlobal` (admin-only) to share across departments.
- Auth/testing note: test bypass uses `MASTER_DEPARTMENT_ID=000000000000000000000d00`; ignore in UI.

## Phase 5 UI Behaviors
- Department hierarchy manager: use `/api/v1/departments` list to render rows/cards with `counts` badges; disable delete when any count > 0 or when `level === 'master'`.
- Create flows: show level selector with parent picker only when level=sub; on success, append to local list; handle 403 by showing scope warning (“You can only create within your department”).
- Edit flows: allow name/code inline edit; block level/parent fields (backend rejects changes).
- Delete flows: attempt DELETE and surface backend message from 400/403 (non-empty or master) in a toast/banner.
- Filters/pagination: pass `?limit=` to control page size; for master admin, add department badge filter for downstream content pages (programs/subjects/class levels) when those endpoints gain `department` query.
- Staff/content creation: default department to current user; master admins expose a department selector; surface `isGlobal` toggle for SCORM uploads with helper text “Visible to all departments”.
- Empty states: when list returns empty under scope, show friendly message “No items in your department scope”.

## UX Copy / Labels
- Department badge: "Dept: {name}"; Global badge: "Global".
- SCORM upload toggle: label “Share globally”, helper “Available to all departments; managed by Master Admins.”
- Department picker placeholder: “Select department”.

## Future Enhancements
- Bulk move content between departments (with safety checks).
- Department-specific dashboards (usage counts, package adoption, teacher activity).
- Role refinement: explicit Department Admin role if needed.
