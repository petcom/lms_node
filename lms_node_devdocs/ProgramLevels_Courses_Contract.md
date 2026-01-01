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
  "department": "<ObjectId>"
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
    "archived": false
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
{ "name": "Level 1", "order": 1, "department": "<ObjectId>" | null }
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
  "description": "Course description",
  "program": "<ObjectId>",
  "programLevel": "<ObjectId>",
  "department": "<ObjectId>"
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
{ "title": "Course 1", "programLevel": "<ObjectId>" | null, "department": "<ObjectId>" | null }
```

### Archive
PATCH `/courses/:id/archive`
PATCH `/courses/:id/unarchive`

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
  "isRequired": true
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
{ "contentType": "scorm" | "custom", "order": 1, "isRequired": false }
```

### Delete
DELETE `/course-contents/:id`
