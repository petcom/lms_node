# Staff Multi-Department Backend Implementation Plan

## Goal
Enable staff to have multiple department memberships with per-department roles.

## Phase 1: Data Model + Types
- Update `model/Staff/Staff.ts` to add `departmentMemberships[]`.
- Add a schema for membership entries: `{ departmentId, roles, createdAt, updatedAt }`.
- Update TypeScript models in `types/models-types.ts`:
  - Add `IDepartmentMembership`.
  - Add `departmentMemberships?: IDepartmentMembership[]` to `IStaff`.
- Keep `department` and `roles` for now (mark as legacy fields in comments) to avoid breaking read paths.

## Phase 2: Migration + Backfill
- Create a migration script (or extend existing) to backfill:
  - If `staff.department` exists, create a single membership entry.
  - Map existing `User.subroles` (or staff roles) into membership `roles`.
- Ensure uniqueness by `departmentId` (dedupe if needed).
- Record migration in `lms_node_devdocs/Class-Course-Program_Migration_Plan.md` if required.

## Phase 3: API Updates
- Identity endpoints:
  - `POST /staff/admins/staff/register` accepts `departmentMemberships`.
  - `PUT /staff/admins/staff/:staffId/update` accepts `departmentMemberships`.
  - Validation should require `departmentId` + non-empty `roles` for each entry.
- Department Resources:
  - `GET /department-resources/staffusers` returns `departmentMemberships`.
  - When scope is limited, filter memberships to caller scope.

## Phase 4: Authorization + Role Resolution
- Update role resolution helpers to use `departmentMemberships` when deriving per-department roles.
- Ensure `departmentScope` checks use membership departments for staff.
- If `User.subroles` is still used elsewhere, decide whether it mirrors the union of memberships or is deprecated.

## Phase 5: Tests
- Add/extend integration tests:
  - Staff create with multiple memberships.
  - Department Resources list shows per-department roles.
  - Scope filtering returns only in-scope memberships.
- Update any tests assuming `department` is single-valued on staff.

## Phase 6: Cleanup (Optional)
- Deprecate `staff.department` and `User.subroles` once all read paths use `departmentMemberships`.
- Remove legacy fields after a migration window.

## Open Decisions
- Who can edit memberships: global-admin only or scoped department-admin?
- Should staff require at least one membership before activation?
- Should `User.subroles` reflect a union of all membership roles or be removed entirely?
