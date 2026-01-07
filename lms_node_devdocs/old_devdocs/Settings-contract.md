# Settings Contract (Design Proposal)

Base URL: `/api/v1/settings`

## Purpose
Provide global, global-admin-only configuration for platform defaults (starting with pagination),
with optional per-resource overrides. This doc is a proposal and should be reviewed
before implementation.

## Auth
- Requires `Authorization: Bearer <token>`
- Role: `global-admin` only

## Data Model (Proposed)
Collection: `settings`

Document shape:
```
{
  "_id": "ObjectId",
  "scope": "global",
  "pagination": {
    "defaultLimit": 10,
    "maxLimit": 100,
    "overrides": {
      "content": { "limit": 10, "maxLimit": 50 },
      "scormPackages": { "limit": 10, "maxLimit": 100 },
      "scormAttempts": { "limit": 10, "maxLimit": 100 },
      "departmentResources": { "limit": 10, "maxLimit": 100 },
      "staffDashboard": { "limit": 10, "maxLimit": 50 }
    }
  },
  "updatedBy": "global-admin-id",
  "updatedAt": "ISO-8601",
  "createdAt": "ISO-8601"
}
```

Notes:
- `scope` is fixed to `"global"` for now.
- `overrides` keys map to resource names used in code (see "Resource Keys").
- `maxLimit` is optional; if omitted, defaults to `pagination.maxLimit`.

## Resource Keys (Proposed)
These keys align with current list endpoints:
- `content` → `/api/v1/content`
- `scormPackages` → `/api/v1/content/scorm/packages`
- `scormAttempts` → `/api/v1/content/scorm/attempts`
- `scormReports` → `/api/v1/content/scorm/reports`
- `departmentResources` → `/api/v1/department-resources`
- `staffDashboard` → `/api/v1/staff/*` list endpoints
- `programs` → `/api/v1/programs`
- `programLevels` → `/api/v1/program-levels`
- `courses` → `/api/v1/courses`
- `courseContents` → `/api/v1/course-contents`
- `programEnrollments` → `/api/v1/program-enrollments`
- `classEnrollments` → `/api/v1/class-enrollments`
- `courseEnrollments` → `/api/v1/course-enrollments`
- `academicYears` → `/api/v1/academic-years`
- `academicTerms` → `/api/v1/academic-terms`
- `yearGroups` → `/api/v1/year-groups`
- `exams` → `/api/v1/exams`
- `questions` → `/api/v1/questions`
- `examResults` → `/api/v1/exam-results`
- `departments` → `/api/v1/departments`

## Endpoints (Proposed)

### Get Settings
GET `/api/v1/settings`

Response:
```
{
  "status": "success",
  "data": { ...settingsDocument }
}
```

### Update Settings
PUT `/api/v1/settings`

Body:
```
{
  "pagination": {
    "defaultLimit": 10,
    "maxLimit": 100,
    "overrides": {
      "content": { "limit": 20 },
      "scormPackages": { "limit": 25, "maxLimit": 200 }
    }
  }
}
```

Response:
```
{
  "status": "success",
  "message": "Settings updated",
  "data": { ...settingsDocument }
}
```

## Resolution Rules (Proposed)
When a list endpoint is called:
1) If `?limit=` is provided, clamp to `maxLimit` (override if present).
2) Otherwise use override `limit` for that resource key (if present).
3) Otherwise fall back to `pagination.defaultLimit`.

## Validation Rules (Proposed)
- `pagination.defaultLimit` must be a positive integer.
- `pagination.maxLimit` must be >= `defaultLimit`.
- `overrides.*.limit` must be a positive integer.
- `overrides.*.maxLimit` must be >= override `limit`.

## Implementation Notes (Not Yet Implemented)
- Add a `Settings` model with a singleton document (scope `global`).
- Add `settingsRouter` mounted at `/api/v1/settings`.
- Add a helper `resolvePagination(resourceKey, req.query.limit)` used by list controllers.
