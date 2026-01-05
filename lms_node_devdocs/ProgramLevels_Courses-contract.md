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
