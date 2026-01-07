# Enrollment API Contract

> **Last Updated:** 2025-01-06  
> **Version:** 2.0 (Post-DCV/EVIP)  
> **Status:** Current

Base URL: `/api/v1`

## Overview

The Enrollment domain manages learner enrollment lifecycle across Programs, Classes, and Courses. This includes tracking active progress, historical records, and credential attainment.

## Important Architecture Notes

### New Enrollment Models (DCV-026/27/28)

The enrollment system now uses specialized models for different purposes:

| Model | Purpose | Use Case |
|-------|---------|----------|
| `ProgramEnrollment` | Overall program journey | Track credential goals, status history, leave |
| `ClassEnrollment` | Class-specific enrollment | Time-bounded cohort membership |
| `CourseEnrollment` | Legacy course enrollment | Basic progress tracking |
| `CourseEnrollmentCurrent` | **Active** course progress (DCV-027) | Real-time progress, attempts |
| `CourseEnrollmentActivity` | **Historical** course records (DCV-028) | Completed/withdrawn courses |

### Batch Operations (EVIP Phase 5)

For efficiency when enrolling multiple learners:

```javascript
// Create multiple enrollments at once
const enrollments = await ProgramEnrollment.insertMany([
  { learner: learner1, program: programId, status: 'enrolled' },
  { learner: learner2, program: programId, status: 'enrolled' }
]);
```

Maximum 100 enrollments per batch request.

---

## Data Models

### ProgramEnrollment

Enhanced model for complete program journey tracking.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `learner` | ObjectId | ✓ | Learner reference |
| `program` | ObjectId | ✓ | Program reference |
| `status` | String | ✓ | `enrolled`, `active`, `on-leave`, `completed`, `withdrawn` |
| `enrolledAt` | Date | ✓ | Enrollment timestamp |
| `credentialGoal` | ObjectId | | Target Credential (DCV-026) |
| `targetCredential` | ObjectId | | Intended credential upon completion |
| `currentProgramLevel` | ObjectId | | Current level in program (DCV-026) |
| `statusHistory` | Object[] | | Status change audit trail (DCV-026) |
| `leaveStart` | Date | | Leave of absence start |
| `leaveEnd` | Date | | Leave of absence end |
| `leaveReason` | String | | Reason for leave |
| `completedAt` | Date | | Completion timestamp |
| `credentialAwarded` | ObjectId | | Credential awarded on completion |
| `withdrawnAt` | Date | | Withdrawal timestamp |
| `withdrawalReason` | String | | Reason for withdrawal |
| `createdBy` | ObjectId | ✓ | User reference |

**StatusHistory Entry:**
```typescript
{
  status: string;
  changedAt: Date;
  changedBy: ObjectId; // User reference
  reason?: string;
}
```

### ClassEnrollment

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `learner` | ObjectId | ✓ | Learner reference |
| `classId` | ObjectId | ✓ | Class reference |
| `program` | ObjectId | | Program reference (denormalized) |
| `programLevel` | ObjectId | | ProgramLevel reference (denormalized) |
| `enrolledAt` | Date | ✓ | Enrollment timestamp |
| `completedAt` | Date | | Completion timestamp |
| `withdrawnAt` | Date | | Withdrawal timestamp |

### CourseEnrollment (Legacy)

Basic course enrollment tracking.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `learner` | ObjectId | ✓ | Learner reference |
| `course` | ObjectId | ✓ | Course reference |
| `classId` | ObjectId | | Class reference |
| `program` | ObjectId | | Program reference |
| `programLevel` | ObjectId | | ProgramLevel reference |
| `status` | String | ✓ | `active`, `completed`, `withdrawn` |
| `progress` | Number | | Percentage complete (0-100) |
| `startedAt` | Date | | Start timestamp |
| `completedAt` | Date | | Completion timestamp |

### CourseEnrollmentCurrent (DCV-027)

Real-time progress tracking for active course work.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `learner` | ObjectId | ✓ | Learner reference |
| `course` | ObjectId | ✓ | Course reference |
| `programEnrollment` | ObjectId | ✓ | ProgramEnrollment reference |
| `startedAt` | Date | ✓ | Start timestamp |
| `progress` | Object | | Detailed progress tracking |

**Progress Object:**
```typescript
{
  examAttempts: Array<{
    examId: ObjectId;
    attemptNumber: number;
    score: number;
    maxScore: number;
    completedAt: Date;
  }>;
  mediaProgress: Array<{
    mediaId: ObjectId;
    percentComplete: number;
    lastPosition: number;
    completedAt?: Date;
  }>;
  scormAttempts: Array<{
    packageId: ObjectId;
    attemptId: ObjectId;
    status: string;
    score?: number;
  }>;
}
```

### CourseEnrollmentActivity (DCV-028)

Historical record for completed/withdrawn courses.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `learner` | ObjectId | ✓ | Learner reference |
| `course` | ObjectId | ✓ | Course reference |
| `programEnrollment` | ObjectId | ✓ | ProgramEnrollment reference |
| `outcome` | String | ✓ | `completed`, `withdrawn`, `failed` |
| `startedAt` | Date | ✓ | Start timestamp |
| `completedAt` | Date | | Completion timestamp |
| `withdrawnAt` | Date | | Withdrawal timestamp |
| `finalGrade` | Number | | Final grade/score |
| `finalGradePercentage` | Number | | Grade as percentage |
| `creditsEarned` | Number | | Credits awarded |
| `attempts` | Number | | Total attempts made |
| `createdBy` | ObjectId | ✓ | User who recorded the activity |

---

## Program Enrollment Endpoints

### GET `/program-enrollments`

List program enrollments.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `learner` - Filter by learner ID
- `program` - Filter by program ID
- `status` - Filter by status (enrolled/active/on-leave/completed/withdrawn)
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "enrollment-id",
      "learner": {
        "_id": "learner-id",
        "name": { "first": "John", "last": "Doe" }
      },
      "program": {
        "_id": "prog-id",
        "name": "Software Engineering",
        "code": "SE"
      },
      "status": "active",
      "enrolledAt": "2025-01-01T00:00:00Z",
      "currentProgramLevel": {
        "_id": "level-id",
        "name": "Level 2"
      },
      "credentialGoal": {
        "_id": "cred-id",
        "name": "Bachelor of Science"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 50 }
}
```

### POST `/program-enrollments`

Create a program enrollment.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Request Body:**
```json
{
  "learner": "learner-id",
  "program": "prog-id",
  "status": "enrolled",
  "enrolledAt": "2025-01-15T00:00:00Z",
  "credentialGoal": "credential-id",
  "currentProgramLevel": "level-id"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Program enrollment created",
  "data": {
    "_id": "enrollment-id",
    "learner": "learner-id",
    "program": "prog-id",
    "status": "enrolled",
    "enrolledAt": "2025-01-15T00:00:00Z",
    "statusHistory": [
      {
        "status": "enrolled",
        "changedAt": "2025-01-15T00:00:00Z",
        "changedBy": "admin-id"
      }
    ]
  }
}
```

### GET `/program-enrollments/:id`

Get program enrollment by ID.

### PUT `/program-enrollments/:id`

Update program enrollment.

**Request Body:**
```json
{
  "status": "active",
  "currentProgramLevel": "new-level-id",
  "statusChangeReason": "Progressed to next level"
}
```

**Note:** Status changes are automatically tracked in `statusHistory`.

### DELETE `/program-enrollments/:id`

Delete program enrollment (soft delete - sets status to withdrawn).

### PATCH `/program-enrollments/:id/leave`

Record leave of absence.

**Request Body:**
```json
{
  "leaveStart": "2025-06-01",
  "leaveEnd": "2025-09-01",
  "leaveReason": "Medical leave"
}
```

### PATCH `/program-enrollments/:id/return`

Return from leave of absence.

### PATCH `/program-enrollments/:id/complete`

Mark program as completed.

**Request Body:**
```json
{
  "credentialAwarded": "credential-id",
  "completionNotes": "Graduated with honors"
}
```

---

## Class Enrollment Endpoints

### GET `/class-enrollments`

List class enrollments.

**Query Parameters:**
- `learner` - Filter by learner ID
- `classId` - Filter by class ID
- `page`, `limit`

### POST `/class-enrollments`

Create a class enrollment.

**Request Body:**
```json
{
  "learner": "learner-id",
  "classId": "class-id",
  "enrolledAt": "2025-01-15T00:00:00Z"
}
```

### GET `/class-enrollments/:id`

Get class enrollment by ID.

### PUT `/class-enrollments/:id`

Update class enrollment.

**Request Body:**
```json
{
  "completedAt": "2025-05-15T00:00:00Z"
}
```

### DELETE `/class-enrollments/:id`

Delete class enrollment.

---

## Course Enrollment Endpoints

### GET `/course-enrollments`

List course enrollments.

**Query Parameters:**
- `learner` - Filter by learner ID
- `course` - Filter by course ID
- `classId` - Filter by class ID
- `status` - Filter by status
- `page`, `limit`

### POST `/course-enrollments`

Create a course enrollment.

**Request Body:**
```json
{
  "learner": "learner-id",
  "course": "course-id",
  "classId": "class-id",
  "status": "active",
  "startedAt": "2025-01-15T00:00:00Z"
}
```

### GET `/course-enrollments/:id`

Get course enrollment by ID.

### PUT `/course-enrollments/:id`

Update course enrollment.

**Request Body:**
```json
{
  "status": "completed",
  "progress": 100,
  "completedAt": "2025-05-15T00:00:00Z"
}
```

### DELETE `/course-enrollments/:id`

Delete course enrollment.

---

## Course Progress Endpoints (Current/Activity)

### GET `/course-enrollments/current`

Get active course progress for a learner.

**Query Parameters:**
- `learner` - Learner ID (required)
- `programEnrollment` - Filter by program enrollment

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "current-id",
      "course": { "_id": "course-id", "title": "CS101" },
      "startedAt": "2025-01-15T00:00:00Z",
      "progress": {
        "examAttempts": [
          { "examId": "exam-id", "score": 85, "maxScore": 100 }
        ],
        "mediaProgress": [
          { "mediaId": "media-id", "percentComplete": 75 }
        ],
        "scormAttempts": [
          { "packageId": "pkg-id", "status": "completed", "score": 90 }
        ]
      }
    }
  ]
}
```

### POST `/course-enrollments/current`

Start tracking current course progress.

**Request Body:**
```json
{
  "learner": "learner-id",
  "course": "course-id",
  "programEnrollment": "enrollment-id"
}
```

### PUT `/course-enrollments/current/:id`

Update current course progress.

**Request Body:**
```json
{
  "progress": {
    "examAttempts": [...],
    "mediaProgress": [...]
  }
}
```

### POST `/course-enrollments/current/:id/complete`

Complete a course and move to activity history.

**Request Body:**
```json
{
  "outcome": "completed",
  "finalGrade": 88,
  "creditsEarned": 3
}
```

This creates a `CourseEnrollmentActivity` record and removes the `CourseEnrollmentCurrent` entry.

### GET `/course-enrollments/activity`

Get course activity history for a learner.

**Query Parameters:**
- `learner` - Learner ID (required)
- `programEnrollment` - Filter by program enrollment
- `outcome` - Filter by outcome (completed/withdrawn/failed)

---

## Batch Operations (EVIP Phase 5)

### POST `/program-enrollments/batch`

Batch create program enrollments.

**Request Body:**
```json
{
  "enrollments": [
    { "learner": "learner-1", "program": "prog-id", "status": "enrolled" },
    { "learner": "learner-2", "program": "prog-id", "status": "enrolled" },
    { "learner": "learner-3", "program": "prog-id", "status": "enrolled" }
  ]
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "created": ["enrollment-1", "enrollment-2", "enrollment-3"],
    "failed": []
  }
}
```

**Response (207 - Partial):**
```json
{
  "status": "partial",
  "data": {
    "created": ["enrollment-1", "enrollment-2"],
    "failed": [
      { "index": 2, "learner": "learner-3", "error": "Already enrolled in program" }
    ]
  }
}
```

**Validation Rules:**
- Maximum 100 enrollments per request
- Duplicate learner/program combinations are skipped
- All learner IDs validated before insertion
- All program IDs validated before insertion

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Validation error",
  "errors": [
    { "field": "learner", "message": "Learner not found" }
  ]
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "Enrollment not found"
}
```

### 409 Conflict
```json
{
  "status": "fail",
  "message": "Learner already enrolled in this program"
}
```

---

## Related Contracts

- [Identity-api-contract.md](Identity-api-contract.md) - Learner management
- [Academic-api-contract.md](Academic-api-contract.md) - Program/Class structure
- [System-api-contract.md](System-api-contract.md) - Credential definitions
