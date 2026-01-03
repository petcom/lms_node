# UI User Role Implementation

## Purpose
Ensure the UI uses the authoritative role model (global-admin, staff, learner) and the updated identity endpoints, while keeping staff subroles additive and learner status actions program-specific.

## Source of Truth
- Primary role values: `global-admin | staff | learner`.
- Staff subroles: `instructor | department-admin | content-admin | billing-admin`.
- The User record is authoritative for `role` and `subroles`; profiles mirror identity fields but do not own role.
- Tokens must include `role`; UI should normalize legacy values (`admin` -> `global-admin`, `teacher` -> `staff`).

## Identity Endpoints (UI Contracts)
Base URL: `/api/v1`

### Global Admin
- POST `/staff/admins/register`
- POST `/staff/admins/login`
- GET `/staff/admins`
- GET `/staff/admins/profile`
- PUT `/staff/admins/:id`

### Admin Staff Management
- POST `/staff/admins/staff/register`
- GET `/staff/admins/staff`
- GET `/staff/admins/staff/:staffId`
- PUT `/staff/admins/staff/:staffId/update`

### Learner Admin Management
- POST `/learners/admins/register`
- GET `/learners/admins`
- GET `/learners/:learnerID/admins`
- PUT `/learners/:learnerID/update/admins`

### Learner Status Actions (Per Program)
- PUT `/staff/admins/suspend/learner/:id`
- PUT `/staff/admins/unsuspend/learner/:id`
- PUT `/staff/admins/withdraw/learner/:id`
- PUT `/staff/admins/unwithdraw/learner/:id`

Body (required):
```
{ "programId": "PROGRAM_ID", "reason": "optional" }
```

### Staff Status Actions
- PUT `/staff/admins/suspend/staff/:id`
- PUT `/staff/admins/unsuspend/staff/:id`
- PUT `/staff/admins/withdraw/staff/:id`
- PUT `/staff/admins/unwithdraw/staff/:id`

## UI Implementation Notes
- Role normalization: map `admin` -> `global-admin`, `teacher` -> `staff` before gating UI.
- Auth flows: continue using `/staff/admins/login`, `/staff/login`, `/learners/login`, and `/auth/token-info` for role verification.
- User Management: global-admin page must load three directories (admins, staff, learners) using the new admin paths.
- Learner status changes must prompt for `programId` and send it in the request body.
- Staff subroles remain display-only in department resources; authorization is still based on primary role.

## UI Surfaces Impacted
- Login and role redirects: validate role from token or login response.
- User management page: use pluralized admin endpoints for staff/learners; enforce programId for learner status actions.
- Global admin dashboard and nav: role-gated access remains `global-admin`.

## Open Questions
- Should the UI surface staff subroles in the user management table, or only within department resources?
- For learner status changes, do we want to fetch available program IDs for a picker instead of a prompt?
