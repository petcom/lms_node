# Department Resources Interface UI Contract

Base URL: `/api/v1/department-resources`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: system admin or department admin (scoped)

## Staff Users (List)
GET `/staffusers`

Query:
- `type=teacher|dept-admin|staff` (optional)
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
      "role": "admin" | "dept-admin" | "teacher" | "staff",
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
    "id": "user-id",
    "role": "admin" | "dept-admin" | "teacher" | "staff",
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

## Staff Users (Update Role/Admin Privileges)
PATCH `/staffusers/:id/role`

Body:
```
{ "role": "dept-admin" | "teacher" | "staff" }
```

Response:
```
{
  "status": "success",
  "message": "Staff role updated successfully",
  "data": {
    "id": "user-id",
    "role": "admin" | "dept-admin" | "teacher" | "staff",
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

## Content (List)
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

