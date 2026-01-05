# Department Resources UI Contract

Base URL: `/api/v1/department-resources`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: `global-admin` or `staff` with `department-admin` subtype (scoped)

## Staff Users
GET `/staffusers`

Query:
- `type=staff|global-admin|instructor|department-admin|content-admin|billing-admin` (optional)
- `departmentId=<ObjectId>` (optional; `global-admin` only)
- `page`, `limit` (optional)

Response:
```
{
  "status": "success",
  "message": "Staff users fetched successfully",
  "items": [
    {
      "id": "user-id",
      "name": "Last, First M.",
      "email": "email@example.com",
      "role": "global-admin" | "staff",
      "roles": ["instructor","content-admin"],
      "department": {
        "id": "dept-id",
        "name": "Department Name",
        "code": "DEPT",
        "parentId": "parent-id" | null,
        "level": 0 | 1 | 2,
        "passingStyleScore": 80
      } | null,
      "departmentMemberships": [
        {
          "department": { "id": "dept-id", "name": "Department Name" },
          "roles": ["instructor"]
        }
      ]
    }
  ]
}
```

Notes:
- `name` is a display string derived from the structured `name` fields stored on the user (`first`, `middle`, `last`).
- `role` reflects the canonical `User.role`; `roles` reflects `User.subroles` for staff subtypes.
- `departmentMemberships` is included for multi-department staff; for non-global admin views it may be filtered to the scoped department.

## Content
GET `/content`

Query:
- `type=scorm|custom` (optional)
- `customType=exam|quiz|exercise|scorm|custom` (optional)
- `departmentId=<ObjectId>` (optional; `global-admin` only)
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
      "customType": "exam" | "quiz" | "exercise" | "scorm" | "custom",
      "title": "Content Title",
      "department": {
        "id": "dept-id",
        "name": "Department Name",
        "code": "DEPT",
        "parentId": "parent-id" | null,
        "level": 0 | 1 | 2,
        "passingStyleScore": 80
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
  "customType": "exam" | "quiz" | "exercise" | "scorm" | "custom",
  "course": "<ObjectId>",
  "program": "<ObjectId>",
  "programLevel": "<ObjectId>",
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

## Changes (Phase 4)
- Content create/update now uses `course` + `programLevel` instead of legacy `subject` + `classLevel`.

Response:
```
{
  "status": "success",
  "message": "Content created successfully",
  "data": {
    "id": "content-id",
    "type": "custom",
    "customType": "exam" | "quiz" | "exercise" | "scorm" | "custom",
    "title": "Content Title",
    "department": {
      "id": "dept-id",
      "name": "Department Name",
      "code": "DEPT",
      "parentId": "parent-id" | null,
      "level": 0 | 1 | 2,
      "passingStyleScore": 80
    } | null
  }
}
```

Notes:
- `type=scorm` is rejected (use `/api/v1/content/scorm/packages`).

## Content (Update)
PATCH `/content/:id`

Body:
```
{
  "type": "scorm" | "custom",
  "title": "Content Title",
  "description": "Content description",
  "departmentId": "<ObjectId>" | null,
  "course": "<ObjectId>",
  "program": "<ObjectId>",
  "programLevel": "<ObjectId>",
  "academicTerm": "<ObjectId>",
  "academicYear": "<ObjectId>",
  "customType": "exam" | "quiz" | "exercise" | "scorm" | "custom",
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
      "passingStyleScore": 80,
      "children": []
    }
  ]
}
```

## Related Endpoints (Existing)
- `GET /api/v1/departments` returns `{ items: [...] }` (flat list)
- `GET /api/v1/departments/hierarchy` returns `{ items: [...] }` (tree)

Example: `GET /api/v1/departments` item
```
{
  "id": "dept-id",
  "name": "Top Alpha",
  "code": "ALPHA",
  "parentId": null,
  "level": 1,
  "passingStyleScore": 80,
  "counts": {
    "staffCount": 12,
    "programCount": 3,
    "subjectCount": 8,
    "classLevelCount": 4,
    "packageCount": 15,
    "globalPackageCount": 2
  }
}
```

Example: `GET /api/v1/departments/:id`
```
{
  "status": "success",
  "message": "Department fetched successfully",
  "data": {
    "_id": "dept-id",
    "name": "Top Alpha",
    "code": "ALPHA",
    "level": "top",
    "parent": null,
    "ancestors": [],
    "passingStyleScore": 80,
    "counts": {
      "staffCount": 12,
      "programCount": 3,
      "subjectCount": 8,
      "classLevelCount": 4,
      "packageCount": 15,
      "globalPackageCount": 2
    }
  }
}
```

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
{ "name": "Department Name", "code": "DEPT", "passingStyleScore": 80 }
```

## Changes (Phase 1)
- Role values updated to `global-admin | staff` with staff subtypes in `roles`.
- Staff users list supports subtype filters (`instructor`, `department-admin`, `content-admin`, `billing-admin`).
- Department summaries now include `passingStyleScore`.

## Changes (Phase 2)
- No contract changes in this phase.

## Changes (Phase 3)
- No contract changes in this phase.

## Changes (Phase 4)
- New Program Levels + Courses contract: `lms_node_devdocs/ProgramLevels_Courses-contract.md`.
