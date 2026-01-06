# Program Levels + Courses Contract

Base URL: `/api/v1`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: `global-admin` for create/update/delete; `staff` can read
- Department scope enforced where applicable

## Program Levels
### Create
POST `/program-levels`

Body:
```
{
  "program": "<ObjectId>",
  "name": "Level 1",
  "description": "First level",
  "order": 1,
  "department": "<ObjectId>",
  "courses": ["<ObjectId>"]
}
```

Response:
```
{
  "status": "success",
  "message": "Program level created",
  "data": {
    "_id": "<ObjectId>",
    "program": "<ObjectId>",
    "name": "Level 1",
    "description": "First level",
    "order": 1,
    "department": "<ObjectId>",
    "archived": false,
    "courses": ["<ObjectId>"]
  }
}
```

### List
GET `/program-levels?program=<ObjectId>&department=<ObjectId>&includeArchived=true`

### Detail
GET `/program-levels/:id`

### Update
PUT `/program-levels/:id`

Body (any):
```
{
  "name": "Level 1",
  "order": 1,
  "department": "<ObjectId>" | null,
  "courses": ["<ObjectId>"]
}
```

### Archive
PATCH `/program-levels/:id/archive`
PATCH `/program-levels/:id/unarchive`

## Courses
### Create
POST `/courses`

Body:
```
{
  "title": "Course 1",
  "shortDescription": "Short summary",
  "longDescription": "Long description",
  "program": "<ObjectId>",
  "programLevel": "<ObjectId>",
  "department": "<ObjectId>",
  "primaryInstructors": ["<ObjectId>"],
  "secondaryInstructors": ["<ObjectId>"]
}
```

### List
GET `/courses?program=<ObjectId>&programLevel=<ObjectId>&department=<ObjectId>&includeArchived=true`

### Detail
GET `/courses/:id`

### Update
PUT `/courses/:id`

Body (any):
```
{
  "title": "Course 1",
  "shortDescription": "Short summary",
  "longDescription": "Long description",
  "programLevel": "<ObjectId>" | null,
  "department": "<ObjectId>" | null,
  "status": "draft" | "rendered" | "published",
  "primaryInstructors": ["<ObjectId>"],
  "secondaryInstructors": ["<ObjectId>"]
}
```

### Archive
PATCH `/courses/:id/archive`
PATCH `/courses/:id/unarchive`

### Publish / Unpublish
PATCH `/courses/:id/publish`
PATCH `/courses/:id/unpublish`

## Course Content
### Create
POST `/course-contents`

Body:
```
{
  "course": "<ObjectId>",
  "contentType": "scorm" | "custom",
  "scormPackageId": "<ObjectId>",
  "customContentId": "<ObjectId>",
  "order": 1,
  "isRequired": true,
  "shortDescription": "Segment summary",
  "longDescription": "Segment details"
}
```

Notes:
- `scormPackageId` required when `contentType=scorm`
- `customContentId` required when `contentType=custom`

### List
GET `/course-contents?course=<ObjectId>&contentType=scorm|custom`

### Detail
GET `/course-contents/:id`

### Update
PUT `/course-contents/:id`

Body (any):
```
{
  "contentType": "scorm" | "custom",
  "order": 1,
  "isRequired": false,
  "shortDescription": "Segment summary",
  "longDescription": "Segment details"
}
```

### Delete
DELETE `/course-contents/:id`

## Changes (Phase 4)
- No endpoint shape changes; contract remains current for ProgramLevel, Course, and CourseContent routes.

---

## Important Notes (EVIP Phase 2)

### Department Inheritance Pattern (DCV-044)

**Course and ProgramLevel Models:**
- The `department` field has been **removed** from the schema storage
- Department is now inherited from the parent Program via `getDepartment()` method
- This ensures department consistency across the Program hierarchy

**API Request Changes:**
- `department` field in request bodies is **ignored** for Course and ProgramLevel
- The department is automatically derived from the associated Program
- No manual department assignment is needed or supported

**API Response Changes:**
- Department information should be retrieved via the populated Program
- Query filters by department still work via Program lookup

**Example:**
```javascript
// ❌ WRONG - department no longer stored directly
POST /courses
{ "title": "Course 1", "program": "PROG_ID", "department": "DEPT_ID" }
// department field is ignored

// ✅ CORRECT - department comes from Program
const course = await Course.findById(id).populate('programId');
const deptId = course.getDepartment(); // Returns Program's department
```

### Query Pattern Changes
- Queries filtering by department should use Program's department
- Use aggregation or populate to filter courses/levels by department
