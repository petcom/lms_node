# Enrollment APIs Contract

Base URL: `/api/v1`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: `global-admin` for create/update/delete; `staff` can read
- Department scope enforced via the program/class/course department

## Program Enrollment
### Create
POST `/program-enrollments`

Body:
```
{
  "learner": "<ObjectId>",
  "program": "<ObjectId>",
  "status": "active" | "completed" | "withdrawn",
  "enrolledAt": "ISO-8601"
}
```

### List
GET `/program-enrollments?learner=<ObjectId>&program=<ObjectId>&status=active`

### Detail
GET `/program-enrollments/:id`

### Update
PUT `/program-enrollments/:id`

Body (any):
```
{ "status": "completed", "completedAt": "ISO-8601" }
```

### Delete
DELETE `/program-enrollments/:id`

## Class Enrollment
### Create
POST `/class-enrollments`

Body:
```
{
  "learner": "<ObjectId>",
  "classId": "<ObjectId>",
  "enrolledAt": "ISO-8601"
}
```

### List
GET `/class-enrollments?learner=<ObjectId>&classId=<ObjectId>`

### Detail
GET `/class-enrollments/:id`

### Update
PUT `/class-enrollments/:id`

Body (any):
```
{ "completedAt": "ISO-8601", "withdrawnAt": "ISO-8601" }
```

### Delete
DELETE `/class-enrollments/:id`

## Course Enrollment
### Create
POST `/course-enrollments`

Body:
```
{
  "learner": "<ObjectId>",
  "course": "<ObjectId>",
  "classId": "<ObjectId>",
  "status": "active" | "completed" | "withdrawn",
  "progress": 25,
  "startedAt": "ISO-8601"
}
```

### List
GET `/course-enrollments?learner=<ObjectId>&course=<ObjectId>&classId=<ObjectId>&status=active`

### Detail
GET `/course-enrollments/:id`

### Update
PUT `/course-enrollments/:id`

Body (any):
```
{ "status": "completed", "progress": 100, "completedAt": "ISO-8601" }
```

### Delete
DELETE `/course-enrollments/:id`

## Changes (Phase 4)
- Program enrollment completion now updates when all course enrollments in a program are completed.
