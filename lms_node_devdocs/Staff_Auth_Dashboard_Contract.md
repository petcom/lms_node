# Staff Auth + Dashboard Contract

Base URL: `/api/v1/staff`

## Auth
- Requires `Authorization: Bearer <token>` for protected routes.
- Role for staff users is `staff`.

### Login
POST `/login`

Body:
```
{ "email": "staff@example.com", "password": "password" }
```

Response:
```
{
  "status": "success",
  "message": "Staff logged in successfully",
  "data": {
    "accessToken": "<jwt>",
    "role": "staff"
  }
}
```

### Token Info
GET `/api/v1/auth/token-info`

Headers:
```
Authorization: Bearer <jwt>
```

Response:
```
{
  "status": "success",
  "data": {
    "userId": "user-id",
    "role": "staff",
    "issuedAt": "ISO-8601" | null,
    "expiresAt": "ISO-8601" | null,
    "timeRemaining": 12345 | null
  }
}
```

## Staff Profile
GET `/profile`

Response:
```
{
  "status": "success",
  "message": "Staff profile fetched successfully",
  "data": { ... }
}
```

PUT `/<staffId>/update`
PUT `/<staffId>/update/admin`

## Staff Dashboard + Packages
All routes below require `role=staff` (or `global-admin` where noted).

POST `/packages/:id/publish`
POST `/packages/:id/unpublish`
GET `/packages`
GET `/classes`
GET `/dashboard`
GET `/attempts`
GET `/assignments`
POST `/assignments/assign`

Notes:
- These endpoints replace the former `/api/v1/instructors/*` routes.
- Role gates still allow `global-admin` for visibility and support.

## Changes (Phase 1)
- Updated role references to `global-admin`.

## Changes (Phase 2)
- No contract changes in this phase.

## Changes (Phase 3)
- No contract changes in this phase.

## Changes (Phase 4)
- New Program Levels + Courses contract: `lms_node_devdocs/ProgramLevels_Courses_Contract.md`.
