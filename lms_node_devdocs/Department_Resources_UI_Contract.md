# Department Resources UI Contract

Base URL: `/api/v1/department-resources`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: system admin or department admin (scoped)

## Staff Users
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

