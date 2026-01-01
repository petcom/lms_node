# Content v1 Development Plan

## Goal
Implement the unified `/api/v1/content` API for SCORM + custom content along with a course render pipeline and a normalized learner progress model that aggregates both SCORM and custom events for analytics and completion.

## Scope Summary
- Unified content catalog and detail endpoints
- Custom content create/update endpoints
- SCORM pipeline exposed under `/api/v1/content/scorm/*`
- Course composition and render pipeline endpoints
- Custom progress event ingestion
- Normalized learner progress model (SCORM + custom)

## Endpoints (Target)
Base: `/api/v1/content`

### Catalog + Detail
- `GET /` (list content)
- `GET /:id` (content detail)

### Custom Content
- `POST /custom`
- `PATCH /custom/:id`

### SCORM Pipeline (type-specific)
- `POST /scorm/packages`
- `GET /scorm/content/*`
- `POST /scorm/runtime/*`
- `GET /scorm/player/*`
- `GET/POST /scorm/attempts/*`
- `GET /scorm/reports/*`
- `GET /scorm/health/*`

### Courses
- `GET /courses/:id`
- `PATCH /courses/:id`

### Render Pipeline
- `GET /courses/:id/render`
- `POST /courses/:id/render` (force re-render)

### Progress (Custom Events)
- `POST /custom/:id/progress`
  - Normalizes into learner progress model

## Data Model Additions
- `Content` (unified catalog entry)
- `Course` (composition of content segments)
- `RenderedCourse` (cached HTML)
- `LearnerProgress` (normalized progress across SCORM + custom)

## Normalized Progress Model (Concept)
Fields:
- `learnerId`
- `courseId`
- `contentId`
- `segmentId`
- `contentType` (`scorm` | `custom`)
- `status` (`in_progress` | `completed` | `failed`)
- `score` / `maxScore`
- `progress` (0-100)
- `timeSpentSec`
- `lastEventAt`

## Implementation Tasks
1) Define schemas and DB models for `Content`, `Course`, `RenderedCourse`, `LearnerProgress`.
   - Include normalized progress + attempts shapes in schema.
2) Implement unified content list/detail endpoints.
3) Implement custom content create/update endpoints.
4) Re-expose SCORM pipeline under `/api/v1/content/scorm/*`.
5) Implement course composition endpoints (GET/PATCH).
6) Implement render pipeline endpoints (GET/POST) with caching.
7) Implement custom progress endpoint:
   - Accepts event payloads
   - Normalizes into `LearnerProgress` + `Attempt`
8) Normalize SCORM runtime events:
   - Map SCORM completion/score/time into `LearnerProgress` + `Attempt`
9) Add attempts + reporting endpoints:
   - `GET /api/v1/content/:id/attempts`
   - `GET /api/v1/content/reports`
10) Add analytics queries:
   - Course completion
   - Segment completion
   - Unified reporting summary
11) Define segment identifier strategy (generation + storage).
12) Define course completion rules (all segments vs required subset).
13) Add integration tests:
   - Content list/detail
   - Custom content create/update
   - Render pipeline cache hit/miss
   - Progress normalization for SCORM + custom
    - Attempts + reports

## Example Requests/Responses (Targets)
Attempts:
- Request: `GET /api/v1/content/abc123/attempts`
- Response: uses `NormalizedAttempt` shape (see contract).

Reports:
- Request: `GET /api/v1/content/reports?courseId=course123`
- Response: uses `ReportingSummary` shape (see contract).

## Assumptions
- No legacy compatibility required.
- UI will use unified `/api/v1/content` routes.
- CORS and auth tokens allow cross-origin progress posts.
