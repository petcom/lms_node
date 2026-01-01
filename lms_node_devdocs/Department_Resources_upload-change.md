# Department Resources Upload/Change - Development Plan

## Goal
Enable system admins and department admins to grant admin privileges within their allowed scope, add update routes under `/api/v1/department-resources`, and prevent department admins from administering other departments. Rename `Teacher` to `Staff` and introduce role capabilities for staff users.

## Access Rules
- System admins: can assign admin privileges across all departments.
- Department admins: can assign admin privileges only within their own scoped departments.
- No department admin can modify users outside their scope.
- All updates must enforce scope checks against `departmentScope()`.
- Staff roles are assigned per staff member and drive capabilities in the UI.

## Required Endpoints (Proposed)
Base: `/api/v1/department-resources`

### Staff Admin / Role Changes
1) PATCH `/staffusers/:id/role`
   - Body: `{ roles: ["instructor","content-admin","department-admin","billing-admin"] }`
   - Behavior:
     - System admin: can grant/revoke roles across all departments.
     - Department admin: can grant/revoke roles only within scope.
   - Notes:
     - Roles are additive; absence means no capability.
     - Staff user role list replaces legacy `teacher` naming.

2) PATCH `/staffusers/:id/department`
   - Body: `{ departmentId: "<ObjectId>" | null }`
   - Behavior:
     - System admin: can move any staff to any department.
     - Department admin: only within scope.

### Content Add/Update
3) POST `/content`
   - Body:
     - SCORM: `{ type: "scorm", ... }` (or redirect to existing SCORM upload routes)
     - Custom: `{ type: "custom", customType: "exam|quiz|practice|other", ... }`

4) PATCH `/content/:id`
   - Body: `{ type: "scorm" | "custom", ...fields }`

### Programs & Courses (Subjects)
5) POST `/programs`
6) PATCH `/programs/:id`
7) PATCH `/programs/:id/department`
   - Body: `{ departmentId: "<ObjectId>" | null }`

8) POST `/courses` (or `/subjects`)
9) PATCH `/courses/:id`
10) PATCH `/courses/:id/department`
   - Body: `{ departmentId: "<ObjectId>" | null }`
11) PATCH `/courses/:id/program`
   - Body: `{ programId: "<ObjectId>" | null }`

### Departments (Optional)
12) PATCH `/departments/:id`
   - If needed for name/code changes within scope.

## Implementation Task Outline
1) Rename `Teacher` to `Staff`:
   - Model rename, collection alias/migration plan
   - Route renames from `/teachers/*` to `/staff/*` (add backward-compatible alias if needed)
   - Update references in controllers, validators, types, and tests
2) Introduce staff roles:
   - Create roles storage (collection or embedded on Staff model)
   - Define roles: `instructor`, `content-admin`, `department-admin`, `billing-admin`
   - Map role capabilities to authorization checks
3) Define request/response shapes for all new update endpoints.
4) Add validation schemas:
   - Staff role/department updates
   - Content create/update
   - Program/course department reassignment
5) Add controller actions with scope enforcement:
   - Resolve staff user by ID
   - Apply department scope checks for department admins
6) Add routes under `/api/v1/department-resources`:
   - Staff role/department updates
   - Content create/update
   - Program/course changes
7) Wire into `app/app.ts` if needed.
8) Add integration tests:
   - System admin can modify any department user
   - Department admin blocked from out-of-scope changes
   - Role assignment and department change behaviors
9) Update UI contract doc with new endpoints and payloads.
10) Update progress report once tests pass.

## Open Questions
1) Should `Teacher` data be migrated to `Staff` (rename collection), or should `Staff` be an alias of `Teacher`?
Teacher should be migrated to 'Staff' - rename the collection.

2) Where should staff roles be stored (embedded array on Staff, or a separate roles collection)?

create a collection of roles separately, and then use that to validate the staff roles on the Staff array

3) Should content create/update for SCORM remain on existing SCORM routes?

now complete development similar to the previous pattern, create tests for each task - complete development, and then revisit the test and correct until it is passing/successful.  Do that for all items in the upload-change document test
