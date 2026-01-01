# v1 Content API Contract

Base URL: `/api/v1/content`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: `global-admin` or `staff` with `department-admin` subtype for admin operations
- Learners/staff can access assigned content via player/runtime endpoints

## Content Catalog (Unified)
GET `/`

Query:
- `type=scorm|custom` (optional)
- `customType=exam|quiz|practice|other` (optional)
- `departmentId=<ObjectId>` (optional; `global-admin` only)
- `page`, `limit` (optional)

Response:
```
{
  "status": "success",
  "message": "Content fetched successfully",
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
        "level": 0 | 1 | 2,
        "passingStyleScore": 80
      } | null
    }
  ]
}
```

## Content Detail (Unified)
GET `/:id`

Response:
```
{
  "status": "success",
  "message": "Content fetched successfully",
  "data": {
    "id": "content-id",
    "type": "scorm" | "custom",
    "customType": "exam" | "quiz" | "practice" | "other",
    "title": "Content Title",
    "department": { "...": "..." }
  }
}
```

## Content Create/Update (Custom)
POST `/custom`

Body:
```
{
  "customType": "exam" | "quiz" | "practice" | "other",
  "title": "Title",
  "payload": { ... },
  "departmentId": "<ObjectId>"
}
```

PATCH `/custom/:id`

Body:
```
{
  "title": "New Title",
  "payload": { ... },
  "departmentId": "<ObjectId>" | null
}
```

## SCORM (Type-Specific Pipeline)
These endpoints retain the existing SCORM pipeline but live under `/content/scorm/*`.

### Upload / Register
POST `/scorm/packages`
- Same payload/behavior as existing `/api/v1/scorm/packages`

### Content Delivery
GET `/scorm/content/*`
- Same behavior as existing `/api/v1/scorm/content`

### Runtime API
POST `/scorm/runtime/*`
- Same behavior as existing `/api/v1/scorm/runtime`

### Player
GET `/scorm/player/*`
- Same behavior as existing `/api/v1/scorm/player`

### Attempts, Reports, Health
GET/POST `/scorm/attempts/*`
GET `/scorm/reports/*`
GET `/scorm/health/*`
- Same behavior as existing `/api/v1/scorm/*` routes

## Course Composition
GET `/courses/:id`

Response:
```
{
  "status": "success",
  "message": "Course fetched successfully",
  "data": {
    "id": "course-id",
    "title": "Course Title",
    "updatedAt": "...",
    "segments": [
      { "type": "custom", "contentId": "custom-content-id" },
      { "type": "scorm", "contentId": "scorm-package-id" }
    ]
  }
}
```

PATCH `/courses/:id`

Body:
```
{
  "title": "Course Title",
  "segments": [
    { "type": "custom", "contentId": "custom-content-id" },
    { "type": "scorm", "contentId": "scorm-package-id" }
  ]
}
```

## Course Render Pipeline
GET `/courses/:id/render`
- Returns cached HTML if available and fresh.

Response:
```
{
  "status": "success",
  "message": "Course rendered successfully",
  "data": {
    "courseId": "course-id",
    "contentVersion": "2025-01-01T00:00:00.000Z",
    "html": "<html>...</html>"
  }
}
```

POST `/courses/:id/render`
- Forces a re-render (`global-admin` only).

## Event Ingestion (Custom + SCORM)
### Custom Events
POST `/custom/:id/progress`

Body:
```
{
  "courseId": "course-id",
  "segmentId": "segment-id",
  "eventType": "answer" | "quiz_complete" | "section_complete",
  "payload": { "score": 85, "maxScore": 100, "durationSec": 420 }
}
```

### SCORM Events
SCORM runtime events are collected via `/scorm/runtime/*` and mapped into the normalized progress/attempt models.

## Attempts + Reporting (Unified)
GET `/:id/attempts`
- Returns normalized attempts for a content item (SCORM + custom).

Example Response:
```
{
  "status": "success",
  "message": "Attempts fetched successfully",
  "items": [
    {
      "id": "attempt-id",
      "learnerId": "user-id",
      "courseId": "course-id",
      "contentId": "content-id",
      "segmentId": "segment-id",
      "contentType": "custom",
      "customType": "quiz",
      "attemptNumber": 2,
      "startedAt": "2025-01-01T00:00:00.000Z",
      "submittedAt": "2025-01-01T00:10:00.000Z",
      "status": "completed",
      "score": 85,
      "maxScore": 100,
      "passed": true,
      "timeSpentSec": 600,
      "payload": { "answers": ["A","C","B"] }
    }
  ]
}
```

GET `/reports`

Query:
- `courseId=<ObjectId>` (optional)
- `learnerId=<ObjectId>` (optional)
- `contentType=scorm|custom` (optional)
- `customType=exam|quiz|practice|other` (optional)

Response:
- Uses `ReportingSummary` shape below.

Example Response:
```
{
  "status": "success",
  "message": "Content reports fetched successfully",
  "items": [
    {
      "contentId": "content-id",
      "contentType": "scorm",
      "customType": null,
      "title": "SCORM Module 1",
      "status": "completed",
      "progressPercent": 100,
      "score": 95,
      "maxScore": 100,
      "passed": true,
      "lastActivityAt": "2025-01-01T00:10:00.000Z"
    }
  ]
}
```

## Changes (Phase 1)
- Role references updated to `global-admin` and staff subtypes.
- Department summaries include `passingStyleScore`.

## Changes (Phase 2)
- No contract changes in this phase.

## Normalized Progress + Attempts
These shapes are used to normalize SCORM and custom progress data into a shared reporting model.

NormalizedProgress
```
{
  "id": "progress-id",
  "learnerId": "user-id",
  "courseId": "course-id",
  "contentId": "content-id",
  "segmentId": "segment-id",
  "contentType": "scorm" | "custom",
  "customType": "exam" | "quiz" | "practice" | "other",
  "status": "not_started" | "in_progress" | "completed" | "failed",
  "progressPercent": 0,
  "score": 0,
  "maxScore": 100,
  "passed": true,
  "attemptCount": 1,
  "timeSpentSec": 0,
  "lastActivityAt": "2025-01-01T00:00:00.000Z",
  "payload": {}
}
```

NormalizedAttempt
```
{
  "id": "attempt-id",
  "learnerId": "user-id",
  "courseId": "course-id",
  "contentId": "content-id",
  "segmentId": "segment-id",
  "contentType": "scorm" | "custom",
  "customType": "exam" | "quiz" | "practice" | "other",
  "attemptNumber": 1,
  "startedAt": "2025-01-01T00:00:00.000Z",
  "submittedAt": "2025-01-01T00:10:00.000Z",
  "status": "in_progress" | "completed" | "failed",
  "score": 85,
  "maxScore": 100,
  "passed": true,
  "timeSpentSec": 600,
  "payload": {}
}
```

ReportingSummary
```
{
  "items": [
    {
      "contentId": "content-id",
      "contentType": "scorm" | "custom",
      "customType": "exam" | "quiz" | "practice" | "other",
      "title": "Content Title",
      "status": "not_started" | "in_progress" | "completed" | "failed",
      "progressPercent": 75,
      "score": 85,
      "maxScore": 100,
      "passed": true,
      "lastActivityAt": "2025-01-01T00:10:00.000Z"
    }
  ]
}
```

## Legacy Compatibility
If desired, keep `/api/v1/scorm/*` as aliases to `/api/v1/content/scorm/*` during migration.
