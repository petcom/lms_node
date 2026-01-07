# Content API Contract

> **Last Updated:** 2025-01-06  
> **Version:** 2.0 (Post-DCV/EVIP)  
> **Status:** Current

Base URL: `/api/v1/content`

## Overview

The Content domain manages all learning content in the LMS: Custom Content (exams, quizzes, exercises), Course Composition, Media, Templates, and content rendering.

## Important Architecture Notes

### Content Types

| Type | Description | Model |
|------|-------------|-------|
| `custom` | Internal content (exams, quizzes, exercises) | CustomContent |
| `scorm` | SCORM packages (see SCORM contract) | ScormPackage |
| `media` | External hosted content (DCV-051) | Media |

### CustomType Enum (DCV-046)

The `customType` field on CustomContent no longer includes 'scorm':

```typescript
type CustomType = 'exam' | 'quiz' | 'exercise' | 'custom';
// 'scorm' removed - use ScormPackage model instead
```

### Course Content Weight (DCV-045)

CourseContent now supports weighted grading:

```typescript
{
  weight: number; // 0.0 to 1.0, for weighted grade calculation
}
```

### RenderedCourse Enhancements (DCV-048)

RenderedCourse now includes `templateId` and `templateVersion` for cache invalidation:

```typescript
{
  templateId: ObjectId;
  templateVersion: number;
}
```

---

## Data Models

### CustomContent

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `title` | String | ✓ | Content title |
| `customType` | String | ✓ | `exam`, `quiz`, `exercise`, `custom` |
| `payload` | Mixed | | Type-specific content data |
| `department` | ObjectId | | Department reference |
| `questions` | ObjectId[] | | Question references (DCV-047) |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

### CourseContent

Links content items to courses with ordering and grading configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `course` | ObjectId | ✓ | Course reference |
| `contentType` | String | ✓ | `scorm`, `custom` |
| `scormPackageId` | ObjectId | | ScormPackage reference (if scorm) |
| `customContentId` | ObjectId | | CustomContent reference (if custom) |
| `order` | Number | ✓ | Display order in course |
| `isRequired` | Boolean | | Required for completion |
| `weight` | Number | | Grade weight 0.0-1.0 (DCV-045) |
| `shortDescription` | String | | Brief segment summary |
| `longDescription` | String | | Full segment details |
| `createdBy` | ObjectId | ✓ | User reference |

### Media (DCV-051)

External hosted content references.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `title` | String | ✓ | Media title |
| `description` | String | | Description |
| `mediaType` | String | ✓ | `video`, `audio`, `document`, `interactive` |
| `sourceUrl` | String | ✓ | External URL |
| `sourceProvider` | String | | Provider name (youtube, vimeo, etc.) |
| `thumbnailUrl` | String | | Thumbnail image URL |
| `duration` | Number | | Duration in seconds (for video/audio) |
| `fileSize` | Number | | File size in bytes |
| `mimeType` | String | | MIME type |
| `department` | ObjectId | | Department reference |
| `isPublic` | Boolean | | Publicly accessible |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

### MasterTemplate

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Template name |
| `description` | String | | Template description |
| `type` | String | ✓ | `scorm`, `custom`, `hybrid` |
| `status` | String | ✓ | `draft`, `published`, `archived` |
| `departmentId` | ObjectId | | Department reference |
| `isGlobal` | Boolean | | Available to all departments |
| `css` | String | | Template CSS |
| `layout` | Object | | Layout configuration |
| `version` | Number | | Template version |
| `createdBy` | ObjectId | ✓ | Admin reference |

### RenderedCourse

Cached rendered course HTML.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `course` | ObjectId | ✓ | Course reference |
| `html` | String | ✓ | Rendered HTML content |
| `contentVersion` | Date | ✓ | Last content update |
| `templateId` | ObjectId | | Template used (DCV-048) |
| `templateVersion` | Number | | Template version (DCV-048) |

---

## Unified Content Catalog

### GET `/`

List all content (unified catalog).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type` - Filter by type (scorm/custom)
- `customType` - Filter custom content type (exam/quiz/exercise/custom)
- `departmentId` - Filter by department (global-admin only)
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "message": "Content fetched successfully",
  "items": [
    {
      "id": "content-id",
      "type": "custom",
      "customType": "exam",
      "title": "Midterm Exam",
      "department": {
        "id": "dept-id",
        "name": "Computer Science",
        "code": "CS"
      }
    },
    {
      "id": "scorm-id",
      "type": "scorm",
      "title": "Interactive Module",
      "department": {
        "id": "dept-id",
        "name": "Computer Science"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 25 }
}
```

### GET `/:id`

Get content detail by ID.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "content-id",
    "type": "custom",
    "customType": "exam",
    "title": "Midterm Exam",
    "payload": { ... },
    "department": { ... },
    "questions": [...]
  }
}
```

---

## Custom Content Endpoints

### POST `/custom`

Create custom content.

**Headers:** `Authorization: Bearer <token>` (global-admin or department-admin)

**Request Body:**
```json
{
  "title": "Quiz 1",
  "customType": "quiz",
  "payload": {
    "timeLimit": 30,
    "shuffleQuestions": true
  },
  "departmentId": "dept-id",
  "questions": ["question-id-1", "question-id-2"]
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Content created successfully",
  "data": {
    "id": "content-id",
    "type": "custom",
    "customType": "quiz",
    "title": "Quiz 1"
  }
}
```

### PATCH `/custom/:id`

Update custom content.

**Request Body:**
```json
{
  "title": "Updated Quiz 1",
  "payload": { ... },
  "departmentId": "new-dept-id"
}
```

---

## Course Composition Endpoints

### GET `/courses/:id`

Get course composition with content segments.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "id": "course-id",
    "title": "Introduction to Programming",
    "shortDescription": "Learn programming basics",
    "longDescription": "Comprehensive introduction...",
    "status": "published",
    "publishedAt": "2025-01-01T00:00:00Z",
    "primaryInstructors": ["staff-id"],
    "segments": [
      {
        "id": "segment-1",
        "type": "scorm",
        "contentId": "scorm-package-id",
        "order": 1,
        "isRequired": true,
        "weight": 0.3,
        "shortDescription": "Interactive Lesson 1"
      },
      {
        "id": "segment-2",
        "type": "custom",
        "contentId": "custom-content-id",
        "customType": "quiz",
        "order": 2,
        "isRequired": true,
        "weight": 0.2,
        "shortDescription": "Quiz 1"
      }
    ]
  }
}
```

### PATCH `/courses/:id`

Update course composition.

**Request Body:**
```json
{
  "title": "Updated Course Title",
  "shortDescription": "Updated summary",
  "longDescription": "Updated description...",
  "status": "draft",
  "primaryInstructors": ["staff-id-1", "staff-id-2"],
  "secondaryInstructors": ["staff-id-3"]
}
```

---

## Course Content Endpoints

See [Academic-api-contract.md](Academic-api-contract.md#course-content-endpoints) for `/course-contents` endpoints.

---

## Course Render Pipeline

### GET `/courses/:id/render`

Get rendered course HTML (cached).

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "courseId": "course-id",
    "contentVersion": "2025-01-06T12:00:00Z",
    "templateId": "template-id",
    "templateVersion": 3,
    "html": "<html>...</html>"
  }
}
```

### POST `/courses/:id/render`

Force re-render course.

**Headers:** `Authorization: Bearer <token>` (global-admin only)

**Response (200):**
```json
{
  "status": "success",
  "message": "Course rendered successfully",
  "data": {
    "courseId": "course-id",
    "contentVersion": "2025-01-06T12:30:00Z",
    "html": "<html>...</html>"
  }
}
```

---

## Progress Tracking

### POST `/custom/:id/progress`

Record custom content progress/event.

**Headers:** `Authorization: Bearer <token>` (learner)

**Request Body:**
```json
{
  "courseId": "course-id",
  "courseContentId": "course-content-id",
  "eventType": "answer",
  "payload": {
    "questionId": "question-id",
    "answer": "B",
    "correct": true,
    "durationSec": 45
  }
}
```

**Event Types:**
- `answer` - Individual question answered
- `quiz_complete` - Quiz/exam completed
- `section_complete` - Content section completed

**Response (200):**
```json
{
  "status": "success",
  "message": "Progress recorded"
}
```

### GET `/learner/progress`

Get learner's content progress report.

**Headers:** `Authorization: Bearer <token>` (learner)

**Query Parameters:**
- `courseId` - Filter by course

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "courseId": "course-id",
    "overallProgress": 75,
    "segments": [
      {
        "contentId": "content-id",
        "type": "custom",
        "progress": 100,
        "score": 85,
        "completedAt": "2025-01-05T10:00:00Z"
      },
      {
        "contentId": "scorm-id",
        "type": "scorm",
        "progress": 50,
        "score": null,
        "completedAt": null
      }
    ]
  }
}
```

---

## Attempts & Reporting

### GET `/:id/attempts`

Get attempts for a content item (unified SCORM + custom).

**Query Parameters:**
- `learnerId` - Filter by learner (admin only)
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "attemptId": "attempt-id",
      "learner": { "_id": "learner-id", "name": "..." },
      "startedAt": "2025-01-05T09:00:00Z",
      "completedAt": "2025-01-05T10:00:00Z",
      "score": 85,
      "maxScore": 100,
      "status": "completed",
      "durationSec": 3600
    }
  ]
}
```

### GET `/reports`

List content reports.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Query Parameters:**
- `contentType` - Filter by type
- `departmentId` - Filter by department
- `dateFrom`, `dateTo` - Date range

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "contentId": "content-id",
      "title": "Quiz 1",
      "type": "custom",
      "totalAttempts": 150,
      "averageScore": 78.5,
      "completionRate": 0.92
    }
  ]
}
```

---

## Media Endpoints (DCV-051)

### GET `/media`

List media items.

**Query Parameters:**
- `mediaType` - Filter by type (video/audio/document/interactive)
- `departmentId` - Filter by department
- `page`, `limit`

### POST `/media`

Create media reference.

**Request Body:**
```json
{
  "title": "Introduction Video",
  "description": "Welcome video for the course",
  "mediaType": "video",
  "sourceUrl": "https://youtube.com/watch?v=...",
  "sourceProvider": "youtube",
  "thumbnailUrl": "https://img.youtube.com/...",
  "duration": 600,
  "departmentId": "dept-id"
}
```

### GET `/media/:id`

Get media by ID.

### PUT `/media/:id`

Update media.

### DELETE `/media/:id`

Delete media reference.

---

## Template Endpoints

### GET `/templates`

List templates.

**Query Parameters:**
- `departmentId` - Filter by department
- `type` - Filter by type (scorm/custom/hybrid)
- `status` - Filter by status (draft/published/archived)
- `isGlobal` - Filter global templates

**Response (200):**
```json
{
  "status": "success",
  "items": [
    {
      "id": "template-id",
      "name": "Standard Course Template",
      "type": "hybrid",
      "status": "published",
      "isGlobal": true,
      "score": {
        "value": 87,
        "comparedToVersion": 3,
        "passingStyleScore": 80
      }
    }
  ]
}
```

### POST `/templates`

Create a template.

**Request Body:**
```json
{
  "name": "Department Template",
  "description": "Custom template for department",
  "type": "custom",
  "departmentId": "dept-id",
  "isGlobal": false,
  "css": "/* CSS styles */",
  "layout": {
    "grid": "12-column",
    "regions": [
      { "id": "header", "kind": "custom", "title": "Header" },
      { "id": "content", "kind": "scorm", "title": "Main Content" }
    ]
  }
}
```

### GET `/templates/:id`

Get template by ID.

### PATCH `/templates/:id`

Update template.

### POST `/templates/:id/publish`

Publish a template.

### POST `/templates/:id/archive`

Archive a template.

### POST `/templates/score`

Score template CSS against master CSS.

**Request Body:**
```json
{
  "departmentId": "dept-id",
  "css": "/* CSS to score */"
}
```

**Response (200):**
```json
{
  "status": "success",
  "score": {
    "value": 87,
    "comparedToVersion": 3,
    "passingStyleScore": 80,
    "diffs": [
      {
        "selector": ".btn",
        "property": "background-color",
        "expected": "#000",
        "actual": "#111"
      }
    ]
  }
}
```

---

## Master CSS Endpoints

### GET `/departments/:id/master-css`

Get master CSS for a department.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "departmentId": "dept-id",
    "css": "/* Master CSS */",
    "version": 3,
    "updatedAt": "2025-01-06T12:00:00Z"
  }
}
```

### PUT `/departments/:id/master-css`

Update master CSS for a department.

**Request Body:**
```json
{
  "css": "/* Updated master CSS */"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Invalid content type",
  "errors": [
    { "field": "customType", "message": "Must be one of: exam, quiz, exercise, custom" }
  ]
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "Content not found"
}
```

---

## Related Contracts

- [SCORM-api-contract.md](SCORM-api-contract.md) - SCORM package management
- [Academic-api-contract.md](Academic-api-contract.md) - Course/CourseContent structure
- [Enrollment-api-contract.md](Enrollment-api-contract.md) - Progress tracking
