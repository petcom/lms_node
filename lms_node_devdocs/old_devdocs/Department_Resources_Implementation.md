# Department Resources Endpoint - Implementation Plan

## Goal
Provide a department-scoped "resources" API for department admins and system admins that returns:
- Staff users (instructor, dept-admin, staff)
- Content (type=scorm|custom, customType=exam|quiz|practice|other)
- Departments/subdepartments as a hierarchy (tree)

Route base: `/api/v1/department-resources`

## Proposed Routes
1) GET `/api/v1/department-resources/staffusers`
   - Query:
     - `type=instructor|dept-admin|staff` (optional)
     - `departmentId=<ObjectId>` (optional; allowed only for system admins)
     - `page`, `limit` (optional)
   - Response:
     - `{ items: StaffUser[] }` (optionally include pagination metadata)

2) GET `/api/v1/department-resources/content`
   - Query:
     - `type=scorm|custom` (optional)
     - `customType=exam|quiz|practice|other` (optional)
     - `departmentId=<ObjectId>` (optional; allowed only for system admins)
     - `page`, `limit` (optional)
   - Response:
     - `{ items: ContentItem[] }` (optionally include pagination metadata)

3) GET `/api/v1/department-resources/departments`
   - Response:
     - `{ items: DepartmentNode[] }` (tree with `children: []`)
   - Shape mirrors `/api/v1/departments/hierarchy` with department scope applied.

## Access Control
- Allowed roles: system admin (global scope) and department admin (scoped).
- Use existing `departmentScope()` middleware and `roleRestriction('admin')`.
- For `departmentId` query, validate:
  - If scope is `all`, allow any valid department ID.
  - If scope is limited, only allow within the caller's scope.

## Data Shapes
StaffUser
```
{
  "id": "user-id",
  "name": "Full Name",
  "email": "email@example.com",
  "role": "admin" | "instructor" | "staff",
  "department": {
    "id": "dept-id",
    "name": "Department Name",
    "code": "DEPT",
    "parentId": "parent-id" | null,
    "level": 0 | 1 | 2
  } | null
}
```

ContentItem
```
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
```

DepartmentNode
```
{
  "id": "dept-id",
  "name": "Department Name",
  "code": "DEPT",
  "parentId": "parent-id" | null,
  "level": 0 | 1 | 2,
  "children": [DepartmentNode]
}
```

## Mapping to Existing Models
- Staff:
  - Admin model = role "admin" (system or department admin)
  - Instructor model = role "instructor"
  - "staff" is not a current model; define if needed or map to Admin/Instructor only.
- Content:
  - SCORM packages from `ScormPackage` (type "scorm")
  - Custom content from `Exam` (type "custom", customType mapped from `examType`)
  - Additional custom models can be mapped as they are introduced.

## Implementation Tasks
1) Add routes:
   - `routes/departmentResources/departmentResourcesRouter.ts`
2) Add controller:
   - `controller/departmentResources/departmentResourcesCtrl.ts`
3) Add serializer helpers:
   - Department node mapper (reuse from `departmentCtrl.ts`)
4) Add validators:
   - `validators/departmentResourcesValidation.ts` for query params
5) Wire router in `app/app.ts` (or wherever routes are registered)
6) Add tests:
   - Integration tests for each route with department scope

## Task Status
- [x] Routes implemented (`/api/v1/department-resources/*`)
- [x] Controller + serializers implemented
- [x] Query validation added
- [x] Router wired in `app/app.ts`
- [ ] Integration tests passing (blocked by MongoMemoryServer EPERM in current environment)

## Open Questions
1) Should "staff" be a new role or map to Admin/Instructor?
2) Which content models should be included beyond SCORM and exams?
3) Should pagination metadata follow `advancedResults` or a simplified `{ items, pagination }` shape?
