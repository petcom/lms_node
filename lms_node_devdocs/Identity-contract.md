# Identity + Access Contract

Base URL: `/api/v1`

## Important Notes (EVIP Phase 1)

### Email Field Storage (DCV-021, DCV-039, DCV-041)
- **Email is stored ONLY on the `User` model**, not on Learner, Staff, or Admin models
- To retrieve email for a person, use the `getEmail()` method on the model
- When updating profiles, email updates modify the `User` document directly
- The `email` field in request bodies is accepted but only affects the corresponding User

## Shared Shapes
See `lms_node_devdocs/Person_Types.md` for `name`, `addresses`, and `honor` fields.

Role strings: `learner | staff | global-admin`

## Global Admin
### Register
POST `/staff/admins/register`

Body:
```
{ "name": { "first": "Ada", "last": "Lovelace" }, "email": "admin@example.com", "password": "..." }
```
Note: Email is stored on User model, not Admin model.

### Login
POST `/staff/admins/login`

### Profile
GET `/staff/admins/profile`

### Update
PUT `/staff/admins/:id`

### Directory
GET `/staff/admins`

### Staff Status Actions
PUT `/staff/admins/suspend/staff/:id`
PUT `/staff/admins/unsuspend/staff/:id`
PUT `/staff/admins/withdraw/staff/:id`
PUT `/staff/admins/unwithdraw/staff/:id`

### Learner Status Actions
PUT `/staff/admins/suspend/learner/:id`
PUT `/staff/admins/unsuspend/learner/:id`
PUT `/staff/admins/withdraw/learner/:id`
PUT `/staff/admins/unwithdraw/learner/:id`

Body (required):
```
{ "programId": "PROGRAM_ID", "reason": "optional" }
```

## Staff
### Login
POST `/staff/login`

### Profile
GET `/staff/profile`

### Update (Self)
PUT `/staff/:staffId/update`

Body:
```json
{
  "name": { "first": "...", "last": "..." },
  "password": "...",
  "departmentMemberships": [
    { "departmentId": "DEPT_ID", "roles": ["instructor"] }
  ]
}
```
Note (EVIP Phase 1): 
- `email` field removed from interface - email changes go through User model directly
- `department` field removed (DCV-022) - use `departmentMemberships` instead

### Admin Register Staff
POST `/staff/admins/staff/register`

Body (optional addition):
```
{
  "departmentMemberships": [
    { "departmentId": "DEPT_ID", "roles": ["department-admin", "content-admin"] }
  ]
}
```

### Admin Directory
GET `/staff/admins/staff`
GET `/staff/admins/staff/:staffId`

### Admin Update Staff
PUT `/staff/admins/staff/:staffId/update`

Body (optional addition):
```
{
  "departmentMemberships": [
    { "departmentId": "DEPT_ID", "roles": ["instructor"] }
  ]
}
```

## Learners
### Admin Register Learner
POST `/learners/admins/register`

### Login
POST `/learners/login`

### Profile
GET `/learners/profile`

### Update (Self)
PUT `/learners/update`

Body:
```json
{
  "email": "new-email@example.com",
  "password": "..."
}
```
Note (EVIP Phase 1): Email updates modify User model only, not Learner model.

### Admin Directory
GET `/learners/admins`
GET `/learners/:learnerID/admins`

### Admin Update Learner
PUT `/learners/:learnerID/update/admins`

Body:
```json
{
  "name": { "first": "...", "last": "..." },
  "email": "new-email@example.com"
}
```
Note (EVIP Phase 1): 
- `email` in request body updates User model only
- Learner document only stores name, not email (DCV-041)
