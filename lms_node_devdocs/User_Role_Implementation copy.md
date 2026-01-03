# User Role Implementation

## Purpose
Define a single source of truth for authentication roles and staff subroles while keeping the main roles: `global-admin`, `staff`, and `learner`.

## Role Model
### Primary Roles (single, required)
- `global-admin`
- `staff`
- `learner`

These are the only values used for authorization gates and stored in one place on the User record.

### Staff Subroles (optional, one-to-many)
Staff members can have any combination of subroles. These subroles are additive: a staff member’s effective permissions are the union of all assigned subroles.

Recommended baseline subroles:
- `instructor`
- `department-admin`
- `content-admin`
- `billing-admin`

### Permission Aggregation
Effective permissions for a staff user are the sum of:
- base staff permissions (common staff access)
- all subrole permissions assigned to that staff user

## Single Source of Truth (Recommended)
### Where the role should live
Store **primary role** and **subroles** in a single `User` collection:
- `role`: one of `global-admin | staff | learner`
- `subroles`: string[] (only populated when `role === 'staff'`)

This keeps one authoritative role location for:
- login responses
- JWT token claims
- authorization middleware

### Profile Collections
Separate profile documents store domain data and reference the User by `userId`:
- `staffProfile` (department, staff metadata, program ties)
- `learnerProfile` (enrollments, progress)
- `adminProfile` (platform-level settings)

## Suggested Schema Shapes
### User
- `_id`
- `email`
- `username`
- `passwordHash`
- `role` (enum: global-admin | staff | learner)
- `subroles` (string[], only for staff)
- `status` (active | inactive | archived | deleted)
- `emailVerified` (boolean)
- `emailVerifiedAt` (timestamp, nullable)
- `lastLoginAt` (timestamp, nullable)
- `passwordUpdatedAt` (timestamp, nullable)
- `createdAt`, `updatedAt`

### StaffProfile
- `_id`
- `userId` (ref User)
- `departmentId`
- `staffRoles` (optional mirror of subroles for reporting; not authoritative)
- `metadata` (license, employment status, etc.)

### LearnerProfile
- `_id`
- `userId` (ref User)
- `departmentId`
- `enrollments`
- `progress`
- `programEnrolmentStatuses` (per-program status; see below)

Program status model (per enrollment):
- `programId`
- `status` (active | withdrawn | suspended)
- `statusReason` (optional)
- `statusUpdatedAt`

### AdminProfile
- `_id`
- `userId` (ref User)
- `departmentId` (optional)

## Operational Rules
- Tokens should always contain `role` from the User record.
- Staff subroles are used to construct permission checks (e.g., content-admin grants content permissions).
- Any endpoint that returns a role to the UI must return the User role as the canonical value.

## Migration Notes (High Level)
- Introduce `User` collection and backfill from Admin/Staff/Learner.
- Update login to authenticate against `User` and load the profile by role.
- Update department resources and identity endpoints to read role from `User`.

## Implementation Notes (Current)
- **User collection is authoritative** for `role` and `subroles`.
- **Profiles share the same `_id`** as their User document to preserve existing foreign keys.
- **Passwords live only on User** (`passwordHash` + `passwordUpdatedAt`).
- **Profile email is mirrored** for convenience in API responses; User remains the source for login and uniqueness checks.
- **Staff subroles** are stored in `User.subroles` and used by Department Resources filtering.
- **Learner status is per program** via `programEnrolmentStatuses` on the learner profile.
- **Learner suspend/withdraw endpoints** now require `programId` in the request body.
- **Admin-only staff routes** are now under `/api/v1/staff/admins/staff/*` (singular `/staff/admin` removed).

## Validation Check (Current)
- No profile schemas contain `password` or `role`; credentials live only on `User`.
- Learner global suspension/withdrawal flags are removed; per-program status lives in `programEnrolmentStatuses`.
- Learner admin routes are pluralized: `/learners/admins/*` (no singular `/learners/admin` paths).
- Staff suspension/withdrawal remains on staff profiles (intentional for staff lifecycle actions).
