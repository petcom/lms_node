# Identity + Access Contract

Base URL: `/api/v1`

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

## Staff
### Login
POST `/staff/login`

### Profile
GET `/staff/profile`

### Update (Self)
PUT `/staff/:staffId/update`

### Admin Register Staff
POST `/staff/admin/register`

### Admin Directory
GET `/staff/admin`
GET `/staff/:staffId/admin`

### Admin Update Staff
PUT `/staff/:staffId/update/admin`

## Learners
### Admin Register Learner
POST `/learners/admins/register`

### Login
POST `/learners/login`

### Profile
GET `/learners/profile`

### Update (Self)
PUT `/learners/update`

### Admin Directory
GET `/learners/admin`
GET `/learners/:learnerID/admin`

### Admin Update Learner
PUT `/learners/:learnerID/update/admin`
