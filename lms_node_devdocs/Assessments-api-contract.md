# Assessments API Contract

> **Last Updated:** 2025-01-06  
> **Version:** 2.0 (Post-DCV/EVIP)  
> **Status:** Current

Base URL: `/api/v1`

## Overview

The Assessments domain manages exams, questions, exam results, and grading. This includes exam creation, question banks, learner submissions, and result publication.

## Important Architecture Notes

### Grading Policy (DCV-033)

Exams now support configurable grading policies:

```typescript
interface GradingPolicy {
  type: 'percentage' | 'points' | 'pass-fail' | 'rubric';
  passingScore: number;
  weights?: { [questionType: string]: number };
}
```

### Max Attempts (DCV-033)

Exams can limit the number of attempts:

```typescript
{
  maxAttempts: number; // null = unlimited
}
```

### CreatedBy Reference (DCV-053)

Exam and Question now reference `User` via shared `_id` pattern:

```typescript
{
  createdBy: { type: ObjectId, ref: 'User' }
}
```

### Questions Integration (DCV-047)

CustomContent (for quizzes/exercises) can reference Question documents:

```typescript
interface CustomContent {
  questions: ObjectId[]; // Question references
}
```

---

## Data Models

### Exam

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Exam name |
| `description` | String | | Exam description |
| `course` | ObjectId | | Course reference |
| `program` | ObjectId | | Program reference |
| `programLevel` | ObjectId | | ProgramLevel reference |
| `academicYear` | ObjectId | | AcademicYear reference |
| `academicTerm` | ObjectId | | AcademicTerm reference |
| `passMark` | Number | ✓ | Minimum passing score |
| `totalMark` | Number | ✓ | Maximum possible score |
| `duration` | String | | Time limit (e.g., "45 minutes") |
| `examDate` | Date | | Scheduled date |
| `examTime` | String | | Scheduled time |
| `examType` | String | ✓ | `exam`, `quiz`, `midterm`, `final` |
| `examStatus` | String | ✓ | `pending`, `live`, `completed`, `archived` |
| `gradingPolicy` | Object | | Grading configuration (DCV-033) |
| `maxAttempts` | Number | | Maximum attempts allowed (DCV-033) |
| `questions` | ObjectId[] | | Question references |
| `shuffleQuestions` | Boolean | | Randomize question order |
| `showResults` | Boolean | | Show results to learner |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

### Question

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `question` | String | ✓ | Question text |
| `questionType` | String | ✓ | `multiple-choice`, `true-false`, `short-answer`, `essay` |
| `optionA` | String | | Option A text |
| `optionB` | String | | Option B text |
| `optionC` | String | | Option C text |
| `optionD` | String | | Option D text |
| `correctAnswer` | String | ✓ | Correct answer (A/B/C/D or text) |
| `points` | Number | | Question point value |
| `explanation` | String | | Answer explanation |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

### ExamResult

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `learner` | ObjectId | ✓ | Learner reference |
| `exam` | ObjectId | ✓ | Exam reference |
| `programLevel` | ObjectId | | ProgramLevel reference |
| `academicTerm` | ObjectId | | AcademicTerm reference |
| `academicYear` | ObjectId | | AcademicYear reference |
| `attemptNumber` | Number | ✓ | Attempt sequence number |
| `score` | Number | ✓ | Achieved score |
| `percentage` | Number | | Score as percentage |
| `passed` | Boolean | | Met passing criteria |
| `answers` | Object[] | | Submitted answers |
| `startedAt` | Date | | Attempt start time |
| `submittedAt` | Date | ✓ | Submission time |
| `gradedAt` | Date | | Grading completion time |
| `gradedBy` | ObjectId | | Staff who graded |
| `isPublished` | Boolean | | Results visible to learner |
| `remarkRequested` | Boolean | | Remark requested |
| `remarkReason` | String | | Reason for remark request |

---

## Exam Endpoints

### GET `/exams`

List all exams.

**Headers:** `Authorization: Bearer <token>` (staff required)

**Query Parameters:**
- `program` - Filter by program
- `programLevel` - Filter by program level
- `course` - Filter by course
- `academicYear` - Filter by academic year
- `academicTerm` - Filter by academic term
- `examStatus` - Filter by status (pending/live/completed/archived)
- `examType` - Filter by type
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "exam-id",
      "name": "Midterm Exam",
      "description": "Covers chapters 1-5",
      "course": { "_id": "course-id", "title": "CS101" },
      "examType": "midterm",
      "examStatus": "live",
      "examDate": "2025-01-15T10:00:00Z",
      "duration": "90 minutes",
      "passMark": 60,
      "totalMark": 100,
      "maxAttempts": 1,
      "questionCount": 50
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 15 }
}
```

### POST `/exams`

Create a new exam.

**Headers:** `Authorization: Bearer <token>` (staff required)

**Request Body:**
```json
{
  "name": "Final Exam",
  "description": "Comprehensive final examination",
  "course": "course-id",
  "program": "prog-id",
  "programLevel": "level-id",
  "academicYear": "year-id",
  "academicTerm": "term-id",
  "passMark": 60,
  "totalMark": 100,
  "duration": "120 minutes",
  "examDate": "2025-05-15",
  "examTime": "09:00",
  "examType": "final",
  "examStatus": "pending",
  "gradingPolicy": {
    "type": "percentage",
    "passingScore": 60
  },
  "maxAttempts": 1,
  "shuffleQuestions": true,
  "showResults": false
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Exam created",
  "data": {
    "_id": "new-exam-id",
    "name": "Final Exam",
    "examStatus": "pending"
  }
}
```

### GET `/exams/:id`

Get exam by ID with questions.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "exam-id",
    "name": "Midterm Exam",
    "description": "Covers chapters 1-5",
    "course": { ... },
    "program": { ... },
    "programLevel": { ... },
    "examType": "midterm",
    "examStatus": "live",
    "examDate": "2025-01-15T10:00:00Z",
    "duration": "90 minutes",
    "passMark": 60,
    "totalMark": 100,
    "gradingPolicy": { ... },
    "maxAttempts": 1,
    "questions": [
      {
        "_id": "q-id",
        "question": "What is the capital of France?",
        "optionA": "London",
        "optionB": "Paris",
        "optionC": "Berlin",
        "optionD": "Madrid",
        "points": 2
      }
    ],
    "statistics": {
      "totalAttempts": 45,
      "averageScore": 72.5,
      "passRate": 0.82
    }
  }
}
```

### PUT `/exams/:id`

Update exam.

**Request Body:**
```json
{
  "name": "Updated Exam Name",
  "examStatus": "live",
  "maxAttempts": 2
}
```

### DELETE `/exams/:id`

Delete exam.

**Validation:**
- Cannot delete exams with submitted results

---

## Question Endpoints

### GET `/questions`

List all questions.

**Headers:** `Authorization: Bearer <token>` (staff required)

**Query Parameters:**
- `examId` - Filter by exam
- `questionType` - Filter by type
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "q-id",
      "question": "What is 2 + 2?",
      "questionType": "multiple-choice",
      "optionA": "3",
      "optionB": "4",
      "optionC": "5",
      "optionD": "6",
      "correctAnswer": "B",
      "points": 1
    }
  ]
}
```

### POST `/questions`

Create a new question.

**Headers:** `Authorization: Bearer <token>` (staff required)

**Request Body:**
```json
{
  "question": "What is the output of console.log(typeof null)?",
  "questionType": "multiple-choice",
  "optionA": "null",
  "optionB": "undefined",
  "optionC": "object",
  "optionD": "string",
  "correctAnswer": "C",
  "points": 2,
  "explanation": "This is a well-known JavaScript quirk where typeof null returns 'object'"
}
```

### POST `/questions/:examID`

Add question to an exam.

**Headers:** `Authorization: Bearer <token>` (staff required)

**Request Body:**
```json
{
  "question": "New question for this exam",
  "questionType": "multiple-choice",
  "optionA": "A",
  "optionB": "B",
  "optionC": "C",
  "optionD": "D",
  "correctAnswer": "A",
  "points": 1
}
```

### GET `/questions/:id`

Get question by ID.

### PUT `/questions/:id`

Update question.

### DELETE `/questions/:id`

Delete question.

---

## Exam Results Endpoints

### GET `/exam-results`

List exam results.

**Headers:** `Authorization: Bearer <token>` (staff or learner)

**Query Parameters:**
- `exam` - Filter by exam
- `learner` - Filter by learner (staff only)
- `academicYear` - Filter by academic year
- `academicTerm` - Filter by academic term
- `programLevel` - Filter by program level
- `passed` - Filter by pass/fail status
- `isPublished` - Filter by publication status
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "result-id",
      "learner": { "_id": "learner-id", "name": "John Doe" },
      "exam": { "_id": "exam-id", "name": "Midterm" },
      "attemptNumber": 1,
      "score": 85,
      "percentage": 85,
      "passed": true,
      "submittedAt": "2025-01-15T11:30:00Z",
      "isPublished": true
    }
  ]
}
```

### GET `/exam-results/:id`

Get exam result by ID.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "result-id",
    "learner": { ... },
    "exam": { ... },
    "attemptNumber": 1,
    "score": 85,
    "percentage": 85,
    "passed": true,
    "answers": [
      {
        "questionId": "q-id",
        "answer": "B",
        "correct": true,
        "points": 2
      }
    ],
    "startedAt": "2025-01-15T10:00:00Z",
    "submittedAt": "2025-01-15T11:30:00Z",
    "gradedAt": "2025-01-15T12:00:00Z",
    "gradedBy": { "_id": "staff-id", "name": "Prof. Smith" }
  }
}
```

### GET `/exam-results/learner/:learnerId`

Get all results for a learner.

**Headers:** `Authorization: Bearer <token>` (learner for self, staff for any)

### GET `/exam-results/check/:examId`

Check learner's result for an exam.

**Headers:** `Authorization: Bearer <token>` (learner)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "examId": "exam-id",
    "hasAttempted": true,
    "attempts": 1,
    "maxAttempts": 2,
    "canRetake": true,
    "bestScore": 75,
    "passed": true,
    "isPublished": true
  }
}
```

### PUT `/exam-results/:id/admin-toggle-publish`

Toggle result publication status.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Response (200):**
```json
{
  "status": "success",
  "message": "Result publication toggled",
  "data": {
    "_id": "result-id",
    "isPublished": true
  }
}
```

### POST `/exam-results/remark/:id`

Request a remark.

**Headers:** `Authorization: Bearer <token>` (learner)

**Request Body:**
```json
{
  "reason": "I believe question 3 was graded incorrectly"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Remark request submitted",
  "data": {
    "_id": "result-id",
    "remarkRequested": true,
    "remarkReason": "I believe question 3 was graded incorrectly"
  }
}
```

---

## Learner Exam Endpoints

### POST `/learners/exams/:examID/write`

Submit exam answers.

**Headers:** `Authorization: Bearer <token>` (learner)

**Request Body:**
```json
{
  "answers": [
    { "questionId": "q-id-1", "answer": "B" },
    { "questionId": "q-id-2", "answer": "A" },
    { "questionId": "q-id-3", "answer": "D" }
  ]
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Exam submitted successfully",
  "data": {
    "resultId": "result-id",
    "attemptNumber": 1,
    "submittedAt": "2025-01-15T11:30:00Z",
    "score": 85,
    "percentage": 85,
    "passed": true
  }
}
```

**Validation:**
- Exam must be in "live" status
- Learner must not exceed maxAttempts
- All required questions must be answered

---

## Grading Endpoints

### POST `/exam-results/:id/grade`

Grade an exam result (for essay/manual grading).

**Headers:** `Authorization: Bearer <token>` (staff)

**Request Body:**
```json
{
  "grades": [
    { "questionId": "essay-q-id", "score": 18, "maxScore": 20, "feedback": "Good analysis" }
  ]
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Exam graded",
  "data": {
    "_id": "result-id",
    "score": 88,
    "percentage": 88,
    "passed": true,
    "gradedAt": "2025-01-16T10:00:00Z",
    "gradedBy": "staff-id"
  }
}
```

### POST `/exam-results/batch-publish`

Publish multiple exam results.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Request Body:**
```json
{
  "resultIds": ["result-1", "result-2", "result-3"]
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Results published",
  "data": {
    "published": 3
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Validation error",
  "errors": [
    { "field": "answers", "message": "Missing required questions" }
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
  "message": "Exam not found"
}
```

### 409 Conflict
```json
{
  "status": "fail",
  "message": "Exam is not currently live"
}
```

---

## Related Contracts

- [Content-api-contract.md](Content-api-contract.md) - Custom content (quizzes)
- [Enrollment-api-contract.md](Enrollment-api-contract.md) - Course progress
- [Calendar-api-contract.md](Calendar-api-contract.md) - Exam scheduling
- [Academic-api-contract.md](Academic-api-contract.md) - Course/ProgramLevel context
