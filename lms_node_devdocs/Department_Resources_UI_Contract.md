# Department Resources UI Contract

Base URL: `/api/v1/department-resources`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: system admin or department admin (scoped)

## Staff Users
GET `/staffusers`

Query:
- `type=teacher|dept-admin|staff` (optional; `teacher` is an alias for staff users)
- `departmentId=<ObjectId>` (optional; system admin only)
- `page`, `limit` (optional)

Response:
```
{
  "status": "success",
  "message": "Staff users fetched successfully",
  "items": [
    {
      "id": "user-id",
      "name": "Full Name",
      "email": "email@example.com",
      "role": "admin" | "dept-admin" | "staff",
      "department": {
        "id": "dept-id",
        "name": "Department Name",
        "code": "DEPT",
        "parentId": "parent-id" | null,
        "level": 0 | 1 | 2
      } | null
    }
  ]
}
```

## Content
GET `/content`

Query:
- `type=scorm|custom` (optional)
- `customType=exam|quiz|practice|other` (optional)
- `departmentId=<ObjectId>` (optional; system admin only)
- `page`, `limit` (optional)

Response:
```
{
  "status": "success",
  "message": "Department content fetched successfully",
  "items": [
    {
      "id": "content-id",
      "type": "scorm" | "custom",
      "customType": "exam" | "quiz" | "practice" | "other",
      "title": "Content Title",
      "department": {
        "id": "dept-id",
        "name": "Department Name",
        "code": "DEPT",
        "parentId": "parent-id" | null,
        "level": 0 | 1 | 2
      } | null
    }
  ]
}
```

Notes:
- `customType` is present only when `type=custom`.
- `type=scorm` items omit `customType`.

## Content (Create)
POST `/content`

Body (custom exam only):
```
{
  "type": "custom",
  "title": "Content Title",
  "description": "Content description",
  "customType": "exam" | "quiz" | "practice" | "other",
  "subject": "<ObjectId>",
  "program": "<ObjectId>",
  "classLevel": "<ObjectId>",
  "academicTerm": "<ObjectId>",
  "academicYear": "<ObjectId>",
  "passMark": 30,
  "totalMark": 100,
  "duration": "30 minutes",
  "examDate": "2025-01-01T00:00:00Z",
  "examTime": "10:00",
  "examStatus": "pending" | "live"
}
```

Response:
```
{
  "status": "success",
  "message": "Content created successfully",
  "data": {
    "id": "content-id",
    "type": "custom",
    "customType": "exam" | "quiz" | "practice" | "other",
    "title": "Content Title",
    "department": {
      "id": "dept-id",
      "name": "Department Name",
      "code": "DEPT",
      "parentId": "parent-id" | null,
      "level": 0 | 1 | 2
    } | null
  }
}
```

Notes:
- `type=scorm` is rejected (use `/api/v1/scorm/packages`).

## Content (Update)
PATCH `/content/:id`

Body:
```
{
  "type": "scorm" | "custom",
  "title": "Content Title",
  "description": "Content description",
  "departmentId": "<ObjectId>" | null,
  "subject": "<ObjectId>",
  "program": "<ObjectId>",
  "classLevel": "<ObjectId>",
  "academicTerm": "<ObjectId>",
  "academicYear": "<ObjectId>",
  "customType": "exam" | "quiz" | "practice" | "other",
  "passMark": 30,
  "totalMark": 100,
  "duration": "30 minutes",
  "examDate": "2025-01-01T00:00:00Z",
  "examTime": "10:00",
  "examStatus": "pending" | "live"
}
```

Response:
```
{
  "status": "success",
  "message": "Content updated successfully",
  "data": { ... }
}
```

## Departments (Tree)
GET `/departments`

Response:
```
{
  "status": "success",
  "message": "Department hierarchy fetched successfully",
  "items": [
    {
      "id": "dept-id",
      "name": "Department Name",
      "code": "DEPT",
      "parentId": "parent-id" | null,
      "level": 0 | 1 | 2,
      "children": []
    }
  ]
}
```

## Related Endpoints (Existing)
- `GET /api/v1/departments` returns `{ items: [...] }` (flat list)
- `GET /api/v1/departments/hierarchy` returns `{ items: [...] }` (tree)

## Staff Users (Update Department)
PATCH `/staffusers/:id/department`

Body:
```
{ "departmentId": "<ObjectId>" | null }
```

Response:
```
{
  "status": "success",
  "message": "Staff department updated successfully",
  "data": {
    "_id": "user-id",
    "name": "Full Name",
    "email": "email@example.com",
    "role": "staff",
    "roles": ["instructor","content-admin","department-admin","billing-admin"],
    "department": "<ObjectId>" | null
  }
}
```

## Staff Users (Update Roles)
PATCH `/staffusers/:id/role`

Body:
```
{ "roles": ["instructor","content-admin","department-admin","billing-admin"] }
```

Response:
```
{
  "status": "success",
  "message": "Staff roles updated successfully",
  "data": {
    "_id": "user-id",
    "name": "Full Name",
    "email": "email@example.com",
    "role": "staff",
    "roles": ["instructor","content-admin","department-admin","billing-admin"],
    "department": "<ObjectId>" | null
  }
}
```

## Programs
POST `/programs`

Body:
```
{
  "name": "Program Name",
  "description": "Program description",
  "duration": "4 years",
  "code": "PRG01",
  "departmentId": "<ObjectId>"
}
```

PATCH `/programs/:id`

Body:
```
{
  "name": "Program Name",
  "description": "Program description",
  "duration": "4 years",
  "code": "PRG01"
}
```

PATCH `/programs/:id/department`

Body:
```
{ "departmentId": "<ObjectId>" | null }
```

## Courses (Subjects)
POST `/courses`

Body:
```
{
  "name": "Course Name",
  "description": "Course description",
  "duration": "3 months",
  "academicYear": "<ObjectId>",
  "departmentId": "<ObjectId>",
  "programId": "<ObjectId>"
}
```

PATCH `/courses/:id`

Body:
```
{
  "name": "Course Name",
  "description": "Course description",
  "duration": "3 months",
  "academicYear": "<ObjectId>"
}
```

PATCH `/courses/:id/department`

Body:
```
{ "departmentId": "<ObjectId>" | null }
```

PATCH `/courses/:id/program`

Body:
```
{ "programId": "<ObjectId>" | null }
```

## Departments (Update)
PATCH `/departments/:id`

Body:
```
{ "name": "Department Name", "code": "DEPT" }
```
