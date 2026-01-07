# SCORM API Contract

> **Last Updated:** 2025-01-06  
> **Version:** 2.0 (Post-DCV/EVIP)  
> **Status:** Current

Base URL: `/api/v1/content/scorm`

## Overview

The SCORM domain manages SCORM 1.2/2004 learning packages, runtime API, attempt tracking, player integration, and analytics.

## Important Architecture Notes

### Grading Policy (DCV-033/034)

ScormPackage now supports configurable grading policies:

```typescript
interface GradingPolicy {
  type: 'percentage' | 'points' | 'pass-fail';
  passingScore: number;
  maxAttempts?: number;
}
```

### ContentAttempt Integration

SCORM attempts sync to the unified `ContentAttempt` model for cross-content reporting:

```javascript
// ScormAttempt post-save hook
ScormAttemptSchema.post('save', async function() {
  await ContentAttempt.syncFromScorm(this);
});
```

### CreatedBy Reference (DCV-053)

ScormPackage now references `User` via shared `_id` pattern:

```typescript
{
  createdBy: { type: ObjectId, ref: 'User' }
}
```

---

## Data Models

### ScormPackage

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `title` | String | ✓ | Package title |
| `description` | String | | Package description |
| `version` | String | | SCORM version (1.2/2004) |
| `status` | String | ✓ | `draft`, `published`, `archived` |
| `publishedAt` | Date | | Publication timestamp |
| `course` | ObjectId | | Course reference |
| `program` | ObjectId | | Program reference |
| `programLevel` | ObjectId | | ProgramLevel reference |
| `department` | ObjectId | | Department reference |
| `academicTerm` | ObjectId | | AcademicTerm reference |
| `gradingPolicy` | Object | | Grading configuration (DCV-034) |
| `maxAttempts` | Number | | Maximum allowed attempts (DCV-034) |
| `assignedLearners` | ObjectId[] | | Assigned learner IDs |
| `assignedClasses` | ObjectId[] | | Assigned class IDs |
| `manifestPath` | String | | Path to imsmanifest.xml |
| `launchPath` | String | | Path to launch file |
| `packagePath` | String | | Package storage path |
| `fileSize` | Number | | Package size in bytes |
| `uploadedBy` | ObjectId | | User who uploaded |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

### ScormAttempt

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `learner` | ObjectId | ✓ | Learner reference |
| `package` | ObjectId | ✓ | ScormPackage reference |
| `attemptNumber` | Number | ✓ | Attempt sequence number |
| `status` | String | ✓ | `initialized`, `in-progress`, `completed`, `failed` |
| `score` | Object | | `{ raw, min, max, scaled }` |
| `completionStatus` | String | | SCORM completion status |
| `successStatus` | String | | SCORM success status |
| `startedAt` | Date | ✓ | Attempt start time |
| `completedAt` | Date | | Attempt completion time |
| `totalTimeSeconds` | Number | | Total time in package |
| `cmi` | Object | | Full CMI data model |

**CMI Object (SCORM 2004):**
```typescript
interface CMI {
  completion_status: string;
  success_status: string;
  score: { raw: number; min: number; max: number; scaled: number };
  session_time: string;
  total_time: string;
  location: string;
  suspend_data: string;
  interactions: Array<{
    id: string;
    type: string;
    learner_response: string;
    result: string;
    latency: string;
    timestamp: string;
  }>;
  objectives: Array<{
    id: string;
    score: { raw: number; min: number; max: number; scaled: number };
    success_status: string;
    completion_status: string;
  }>;
}
```

---

## Package Management Endpoints

### GET `/packages`

List SCORM packages.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` - Filter by status (draft/published/archived)
- `departmentId` - Filter by department (global-admin only)
- `programId` - Filter by program
- `courseId` - Filter by course
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "package-id",
      "title": "Safety Training Module",
      "description": "Interactive safety course",
      "version": "2004",
      "status": "published",
      "publishedAt": "2025-01-01T00:00:00Z",
      "department": { "_id": "dept-id", "name": "HR" },
      "gradingPolicy": {
        "type": "percentage",
        "passingScore": 80
      },
      "maxAttempts": 3,
      "assignedLearners": 25,
      "assignedClasses": 2
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 15 }
}
```

### POST `/packages`

Upload a new SCORM package.

**Headers:** 
- `Authorization: Bearer <token>` (staff or global-admin)
- `Content-Type: multipart/form-data`

**Form Data:**
- `file` - SCORM ZIP file (required)
- `title` - Package title
- `description` - Package description
- `departmentId` - Department ID
- `programId` - Program ID
- `programLevelId` - ProgramLevel ID
- `courseId` - Course ID
- `gradingPolicy` - JSON object
- `maxAttempts` - Maximum attempts

**Response (201):**
```json
{
  "status": "success",
  "message": "Package uploaded successfully",
  "data": {
    "_id": "package-id",
    "title": "Safety Training Module",
    "version": "2004",
    "status": "draft",
    "manifestPath": "/scorm-content/packages/pkg-id/imsmanifest.xml",
    "launchPath": "/scorm-content/packages/pkg-id/index.html",
    "fileSize": 15728640
  }
}
```

### GET `/packages/:id`

Get package by ID.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "package-id",
    "title": "Safety Training Module",
    "description": "Interactive safety course",
    "version": "2004",
    "status": "published",
    "department": { ... },
    "program": { ... },
    "programLevel": { ... },
    "course": { ... },
    "gradingPolicy": { ... },
    "maxAttempts": 3,
    "assignedLearners": ["learner-id-1", "learner-id-2"],
    "assignedClasses": ["class-id-1"],
    "analytics": {
      "totalAttempts": 150,
      "completionRate": 0.85,
      "averageScore": 78.5
    }
  }
}
```

### PUT `/packages/:id`

Update package metadata.

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "gradingPolicy": {
    "type": "percentage",
    "passingScore": 75
  },
  "maxAttempts": 5
}
```

### DELETE `/packages/:id`

Delete a package.

### GET `/packages/my-assignments`

Get learner's assigned packages.

**Headers:** `Authorization: Bearer <token>` (learner)

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "package-id",
      "title": "Safety Training",
      "status": "published",
      "myProgress": {
        "attempts": 1,
        "maxAttempts": 3,
        "bestScore": 75,
        "completionStatus": "incomplete"
      }
    }
  ]
}
```

---

## Package Actions

### POST `/packages/:id/publish`

Publish a package.

**Headers:** `Authorization: Bearer <token>` (staff or global-admin)

**Response (200):**
```json
{
  "status": "success",
  "message": "Package published",
  "data": {
    "_id": "package-id",
    "status": "published",
    "publishedAt": "2025-01-06T12:00:00Z"
  }
}
```

### POST `/packages/:id/unpublish`

Unpublish a package.

### POST `/packages/:id/clone`

Clone a global package to department.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Request Body:**
```json
{
  "departmentId": "target-dept-id",
  "title": "Cloned Package Title"
}
```

### POST `/packages/:id/assign`

Assign package to learners/classes.

**Request Body:**
```json
{
  "learnerIds": ["learner-1", "learner-2"],
  "classIds": ["class-1"]
}
```

### POST `/packages/:id/unassign`

Remove package assignments.

**Request Body:**
```json
{
  "learnerIds": ["learner-1"],
  "classIds": []
}
```

---

## Attempt Management

### GET `/attempts`

List all attempts.

**Headers:** `Authorization: Bearer <token>` (staff or global-admin)

**Query Parameters:**
- `packageId` - Filter by package
- `learnerId` - Filter by learner
- `status` - Filter by status
- `dateFrom`, `dateTo` - Date range
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "attempt-id",
      "learner": { "_id": "learner-id", "name": "John Doe" },
      "package": { "_id": "package-id", "title": "Safety Training" },
      "attemptNumber": 1,
      "status": "completed",
      "score": { "raw": 85, "max": 100, "scaled": 0.85 },
      "completionStatus": "completed",
      "successStatus": "passed",
      "startedAt": "2025-01-05T09:00:00Z",
      "completedAt": "2025-01-05T10:30:00Z",
      "totalTimeSeconds": 5400
    }
  ]
}
```

### GET `/attempts/package/:packageId`

Get attempts for a specific package.

### GET `/attempts/:attemptId`

Get attempt detail with full CMI data.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "attempt-id",
    "learner": { ... },
    "package": { ... },
    "attemptNumber": 1,
    "status": "completed",
    "score": { ... },
    "cmi": {
      "completion_status": "completed",
      "success_status": "passed",
      "score": { "raw": 85, "min": 0, "max": 100, "scaled": 0.85 },
      "session_time": "PT1H30M",
      "total_time": "PT1H30M",
      "location": "module5",
      "suspend_data": "...",
      "interactions": [...],
      "objectives": [...]
    }
  }
}
```

### PUT `/attempts/:attemptId`

Update attempt (admin correction).

### POST `/attempts/:attemptId/complete`

Force complete an attempt.

---

## Runtime API (SCORM 1.2/2004)

### POST `/runtime/:attemptId/initialize`

Initialize a SCORM session.

**Headers:** `Authorization: Bearer <token>` (learner)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "attemptId": "attempt-id",
    "cmi": {
      "completion_status": "unknown",
      "success_status": "unknown",
      "location": "",
      "suspend_data": ""
    }
  }
}
```

### POST `/runtime/:attemptId/terminate`

Terminate a SCORM session.

**Response (200):**
```json
{
  "status": "success",
  "message": "Session terminated"
}
```

### GET `/runtime/:attemptId/cmi/:element`

Get a CMI element value.

**Path Parameters:**
- `element` - CMI element path (e.g., `cmi.score.raw`)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "element": "cmi.score.raw",
    "value": "85"
  }
}
```

### PUT `/runtime/:attemptId/cmi/:element`

Set a CMI element value.

**Request Body:**
```json
{
  "value": "85"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Value set"
}
```

### POST `/runtime/:attemptId/commit`

Commit CMI data to server.

**Response (200):**
```json
{
  "status": "success",
  "message": "Data committed"
}
```

---

## Player Endpoints

### GET `/player/:packageId/launch`

Launch SCORM player for a package.

**Headers:** `Authorization: Bearer <token>` (learner)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "attemptId": "new-attempt-id",
    "launchUrl": "/api/v1/content/scorm/player/package-id/content/index.html",
    "runtimeApiUrl": "/api/v1/content/scorm/runtime/attempt-id"
  }
}
```

### GET `/player/:packageId/content/*`

Serve SCORM content files.

**Response:** Static file content (HTML, JS, CSS, media)

### POST `/player/:packageId/exit`

Exit player and save progress.

**Headers:** `Authorization: Bearer <token>` (learner)

**Request Body:**
```json
{
  "attemptId": "attempt-id",
  "cmi": { ... }
}
```

---

## Learner Progress

### GET `/learner/progress`

Get learner's SCORM progress across all packages.

**Headers:** `Authorization: Bearer <token>` (learner)

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "package": {
        "_id": "package-id",
        "title": "Safety Training"
      },
      "attempts": 2,
      "maxAttempts": 3,
      "bestScore": 85,
      "latestAttempt": {
        "_id": "attempt-id",
        "status": "completed",
        "completionStatus": "completed",
        "successStatus": "passed"
      }
    }
  ]
}
```

---

## Reports & Analytics

### GET `/reports/package/:packageId/analytics`

Get package analytics.

**Headers:** `Authorization: Bearer <token>` (staff or global-admin)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "packageId": "package-id",
    "title": "Safety Training",
    "totalLearners": 50,
    "totalAttempts": 75,
    "uniqueCompletions": 42,
    "completionRate": 0.84,
    "averageScore": 78.5,
    "averageTime": 5400,
    "scoreDistribution": {
      "0-50": 5,
      "51-70": 12,
      "71-85": 20,
      "86-100": 13
    },
    "dailyAttempts": [
      { "date": "2025-01-05", "attempts": 8 },
      { "date": "2025-01-06", "attempts": 12 }
    ]
  }
}
```

### GET `/reports/attempt/:attemptId`

Get detailed attempt report.

### GET `/reports/export`

Export tracking data.

**Query Parameters:**
- `packageId` - Filter by package
- `departmentId` - Filter by department
- `dateFrom`, `dateTo` - Date range
- `format` - Export format (csv/json)

**Response (200):** CSV or JSON file download

### GET `/reports/completion-rates`

Get completion rate statistics.

**Query Parameters:**
- `departmentId` - Filter by department
- `programId` - Filter by program
- `dateFrom`, `dateTo` - Date range

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "overall": 0.82,
    "byPackage": [
      { "packageId": "pkg-1", "title": "Module 1", "rate": 0.95 },
      { "packageId": "pkg-2", "title": "Module 2", "rate": 0.78 }
    ],
    "byDepartment": [
      { "departmentId": "dept-1", "name": "Engineering", "rate": 0.88 }
    ]
  }
}
```

---

## Staff/Instructor Endpoints

These endpoints are also available under `/api/v1/staff/`:

### GET `/staff/packages`

List instructor's packages.

### POST `/staff/packages/:id/publish`

Instructor publish package.

### POST `/staff/packages/:id/unpublish`

Instructor unpublish package.

### GET `/staff/attempts`

List attempts for instructor's packages.

### POST `/staff/assignments/assign`

Assign package to learners.

### GET `/staff/assignments`

List instructor's assignments.

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Invalid SCORM package",
  "errors": [
    { "field": "file", "message": "Missing imsmanifest.xml" }
  ]
}
```

### 403 Forbidden
```json
{
  "status": "fail",
  "message": "Maximum attempts reached"
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "Package not found"
}
```

### 413 Payload Too Large
```json
{
  "status": "fail",
  "message": "Package exceeds maximum size (100MB)"
}
```

---

## Related Contracts

- [Content-api-contract.md](Content-api-contract.md) - Unified content catalog
- [Enrollment-api-contract.md](Enrollment-api-contract.md) - Progress tracking
- [Academic-api-contract.md](Academic-api-contract.md) - Course composition
