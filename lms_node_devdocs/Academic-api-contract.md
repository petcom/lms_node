# Academic API Contract

> **Last Updated:** 2025-01-06  
> **Version:** 2.0 (Post-DCV/EVIP)  
> **Status:** Current

Base URL: `/api/v1`

## Overview

The Academic domain manages the organizational and curriculum structure of the LMS: Departments, Programs, Program Levels, Courses, and Classes.

## Important Architecture Notes

### Department Inheritance Pattern (DCV-044)

Course and ProgramLevel no longer store `department` directly. Department is inherited from the parent Program:

```javascript
// ✅ CORRECT - Get department via Program
const course = await Course.findById(id).populate('programId');
const deptId = course.getDepartment(); // Returns Program's department

// ❌ WRONG - Field no longer exists
const deptId = course.department; // undefined
```

### Status Field Standardization (DCV-042, DCV-043)

All academic entities now use consistent status patterns:
- Department: `status: 'active' | 'archived'`
- Program/ProgramLevel/Course: `archived: boolean`

### CreatedBy References (DCV-053)

All academic entities now reference `User` (shared _id pattern) instead of Admin/Staff:

```typescript
{
  createdBy: { type: ObjectId, ref: 'User' } // ← Now User, not Admin
}
```

---

## Data Models

### Department

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Department name |
| `code` | String | ✓ | Unique code |
| `departmentType` | String | ✓ | `master`, `top`, `sub` |
| `parent` | ObjectId | | Parent department reference |
| `ancestors` | ObjectId[] | | Ancestor chain for hierarchy |
| `passingStyleScore` | Number | | Template CSS passing score |
| `status` | String | ✓ | `active`, `archived` (DCV-042) |

### Program

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Program name |
| `code` | String | ✓ | Unique code |
| `shortDescription` | String | | Brief summary |
| `longDescription` | String | | Full description |
| `department` | ObjectId | ✓ | Department reference |
| `archived` | Boolean | | Archive status |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

**Removed Fields (DCV-013/14/15/43):**
- ~~`learners`~~ → Use ProgramEnrollment
- ~~`instructors`~~ → Use Class.instructors
- ~~`courses`~~ → Use Course.programId
- ~~`duration`~~ → Moved to Class level

**Instance Methods:**
- `getDepartment(): ObjectId` - Returns department ID
- `getProgramLevels(): Promise<ProgramLevel[]>` - Returns associated levels
- `getCourses(): Promise<Course[]>` - Returns associated courses

### ProgramLevel

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Level name |
| `description` | String | | Level description |
| `order` | Number | ✓ | Sort order within program |
| `program` | ObjectId | ✓ | Program reference |
| `courses` | ObjectId[] | | Course references |
| `archived` | Boolean | | Archive status |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

**Removed Fields (DCV-044):**
- ~~`department`~~ → Inherit from Program via `getDepartment()`

**Instance Methods:**
- `getDepartment(): ObjectId` - Returns Program's department

### Course

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `title` | String | ✓ | Course title |
| `code` | String | ✓ | Unique code |
| `shortDescription` | String | | Brief summary |
| `longDescription` | String | | Full description |
| `programId` | ObjectId | | Program reference |
| `programLevelId` | ObjectId | | ProgramLevel reference |
| `primaryInstructors` | ObjectId[] | | Primary instructor Staff IDs |
| `secondaryInstructors` | ObjectId[] | | Secondary instructor Staff IDs |
| `status` | String | ✓ | `draft`, `rendered`, `published` |
| `publishedAt` | Date | | Publication timestamp |
| `defaultGradingPolicy` | Object | | Default grading policy (DCV-035) |
| `archived` | Boolean | | Archive status |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

**Removed Fields (DCV-037, DCV-044):**
- ~~`description`~~ → Use `shortDescription` and `longDescription`
- ~~`department`~~ → Inherit from Program via `getDepartment()`

**Instance Methods:**
- `getDepartment(): ObjectId` - Returns Program's department

### Class

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Class name |
| `program` | ObjectId | ✓ | Program reference |
| `programLevel` | ObjectId | ✓ | ProgramLevel reference |
| `department` | ObjectId | ✓ | Department reference |
| `instructors` | ObjectId[] | | Staff references |
| `academicYear` | ObjectId | | AcademicYear reference (DCV-024) |
| `academicTerm` | ObjectId | | AcademicTerm reference (DCV-024) |
| `duration` | String | | Duration (moved from Program - DCV-043) |
| `startDate` | Date | | Class start date |
| `endDate` | Date | | Class end date |
| `maxEnrollment` | Number | | Maximum capacity |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

---

## Department Endpoints

### GET `/departments`

List all departments.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Query Parameters:**
- `departmentType` - Filter by type (master/top/sub)
- `status` - Filter by status (active/archived)
- `parentId` - Filter by parent department
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "dept-id",
      "name": "Engineering",
      "code": "ENG",
      "departmentType": "top",
      "status": "active",
      "parent": "master-dept-id",
      "counts": {
        "programs": 5,
        "staff": 12,
        "courses": 25
      }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 3 }
}
```

**Note (EVIP Phase 3):** Counts use updated queries:
- `staff` count uses `departmentMemberships.departmentId`
- `courses` count aggregates through Program relationship

### POST `/departments`

Create a new department.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Request Body:**
```json
{
  "name": "Computer Science",
  "code": "CS",
  "departmentType": "sub",
  "parent": "eng-dept-id",
  "passingStyleScore": 80
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Department created successfully",
  "data": {
    "_id": "new-dept-id",
    "name": "Computer Science",
    "code": "CS",
    "departmentType": "sub",
    "status": "active",
    "ancestors": ["master-id", "eng-dept-id"]
  }
}
```

### GET `/departments/hierarchy`

Get department tree structure.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "master-id",
      "name": "Master",
      "departmentType": "master",
      "children": [
        {
          "_id": "eng-id",
          "name": "Engineering",
          "departmentType": "top",
          "children": [...]
        }
      ]
    }
  ]
}
```

### GET `/departments/:id`

Get department by ID.

### PUT `/departments/:id`

Update department.

**Request Body:**
```json
{
  "name": "Updated Name",
  "passingStyleScore": 85,
  "status": "archived"
}
```

### DELETE `/departments/:id`

Delete department (only if empty).

---

## Program Endpoints

### GET `/programs`

List all programs.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `departmentId` - Filter by department
- `includeArchived` - Include archived programs (default: false)
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "prog-id",
      "name": "Software Engineering",
      "code": "SE",
      "shortDescription": "Comprehensive SE program",
      "department": {
        "_id": "dept-id",
        "name": "Computer Science"
      },
      "archived": false,
      "levelsCount": 4,
      "coursesCount": 16
    }
  ]
}
```

### POST `/programs`

Create a new program.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Request Body:**
```json
{
  "name": "Data Science",
  "code": "DS",
  "shortDescription": "Learn data science",
  "longDescription": "Comprehensive data science curriculum...",
  "department": "dept-id"
}
```

### GET `/programs/:id`

Get program by ID with levels and courses.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "prog-id",
    "name": "Software Engineering",
    "code": "SE",
    "department": { "_id": "dept-id", "name": "CS" },
    "programLevels": [
      {
        "_id": "level-id",
        "name": "Level 1",
        "order": 1,
        "courses": [...]
      }
    ]
  }
}
```

### PUT `/programs/:id`

Update program.

### DELETE `/programs/:id`

Delete program (only if no enrollments).

### PATCH `/programs/:id/archive`

Archive a program.

### PATCH `/programs/:id/unarchive`

Unarchive a program.

### GET `/programs/:id/courses`

Get all courses for a program.

---

## Program Level Endpoints

### GET `/program-levels`

List all program levels.

**Query Parameters:**
- `program` - Filter by program (required)
- `includeArchived` - Include archived levels
- `page`, `limit`

### POST `/program-levels`

Create a new program level.

**Request Body:**
```json
{
  "program": "prog-id",
  "name": "Foundation",
  "description": "Introductory courses",
  "order": 1,
  "courses": ["course-id-1", "course-id-2"]
}
```

**Note (EVIP Phase 2):** The `department` field in request body is **ignored**. Department is inherited from Program.

### GET `/program-levels/:id`

Get program level by ID.

### PUT `/program-levels/:id`

Update program level.

**Request Body:**
```json
{
  "name": "Updated Name",
  "order": 2,
  "courses": ["course-id-1", "course-id-2"]
}
```

### DELETE `/program-levels/:id`

Delete program level.

### PATCH `/program-levels/:id/archive`

Archive a program level.

### PATCH `/program-levels/:id/unarchive`

Unarchive a program level.

---

## Course Endpoints

### GET `/courses`

List all courses.

**Query Parameters:**
- `program` - Filter by program
- `programLevel` - Filter by program level
- `status` - Filter by status (draft/rendered/published)
- `includeArchived` - Include archived courses
- `page`, `limit`

### POST `/courses`

Create a new course.

**Request Body:**
```json
{
  "title": "Introduction to Programming",
  "code": "CS101",
  "shortDescription": "Learn programming basics",
  "longDescription": "Comprehensive introduction to programming...",
  "program": "prog-id",
  "programLevel": "level-id",
  "primaryInstructors": ["staff-id"],
  "defaultGradingPolicy": {
    "type": "percentage",
    "passingScore": 60
  }
}
```

**Note (EVIP Phase 2):** The `department` field in request body is **ignored**. Department is inherited from Program.

### GET `/courses/:id`

Get course by ID with content composition.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "course-id",
    "title": "Introduction to Programming",
    "code": "CS101",
    "shortDescription": "Learn programming basics",
    "longDescription": "Comprehensive introduction...",
    "status": "published",
    "publishedAt": "2025-01-01T00:00:00Z",
    "program": { "_id": "prog-id", "name": "SE" },
    "programLevel": { "_id": "level-id", "name": "Level 1" },
    "primaryInstructors": [...],
    "courseContents": [...]
  }
}
```

### PUT `/courses/:id`

Update course.

### PATCH `/courses/:id`

Partial update course.

### DELETE `/courses/:id`

Delete course (only if no enrollments).

### PATCH `/courses/:id/archive`

Archive a course.

### PATCH `/courses/:id/unarchive`

Unarchive a course.

### PATCH `/courses/:id/publish`

Publish a course.

**Response (200):**
```json
{
  "status": "success",
  "message": "Course published successfully",
  "data": {
    "_id": "course-id",
    "status": "published",
    "publishedAt": "2025-01-06T12:00:00Z"
  }
}
```

### PATCH `/courses/:id/unpublish`

Unpublish a course.

---

## Class Endpoints

### GET `/classes`

List all classes.

**Query Parameters:**
- `program` - Filter by program
- `programLevel` - Filter by program level
- `department` - Filter by department
- `academicYear` - Filter by academic year
- `academicTerm` - Filter by academic term
- `instructor` - Filter by instructor
- `page`, `limit`

### POST `/classes`

Create a new class.

**Request Body:**
```json
{
  "name": "CS101 - Fall 2025 Section A",
  "program": "prog-id",
  "programLevel": "level-id",
  "department": "dept-id",
  "academicYear": "year-id",
  "academicTerm": "term-id",
  "instructors": ["staff-id"],
  "startDate": "2025-09-01",
  "endDate": "2025-12-15",
  "maxEnrollment": 30
}
```

### GET `/classes/:id`

Get class by ID.

### PUT `/classes/:id`

Update class.

### DELETE `/classes/:id`

Delete class.

---

## Course Content Endpoints

### GET `/course-contents`

List course contents for a course.

**Query Parameters:**
- `course` - Course ID (required)
- `contentType` - Filter by type (scorm/custom)

### POST `/course-contents`

Add content to a course.

**Request Body:**
```json
{
  "course": "course-id",
  "contentType": "scorm",
  "scormPackageId": "package-id",
  "order": 1,
  "isRequired": true,
  "weight": 0.5,
  "shortDescription": "SCORM Module 1",
  "longDescription": "Detailed description..."
}
```

**Note (DCV-045):** The `weight` field is now supported for weighted grading calculations.

### GET `/course-contents/:id`

Get course content by ID.

### PUT `/course-contents/:id`

Update course content.

### DELETE `/course-contents/:id`

Remove content from course.

---

## Deprecated Endpoints (EVIP Phase 4)

The following endpoints are deprecated and will be removed after 2026-06-01:

| Deprecated Endpoint | Replacement |
|---------------------|-------------|
| `POST /department-resources/programs` | `POST /programs` |
| `PATCH /department-resources/programs/:id` | `PUT /programs/:id` |
| `POST /department-resources/courses` | `POST /courses` |
| `PATCH /department-resources/courses/:id` | `PUT /courses/:id` |

These endpoints return RFC 8594 deprecation headers:
- `Deprecation: @2025-01-06`
- `Sunset: Tue, 01 Jun 2026 00:00:00 GMT`
- `Link: </api/v1/programs>; rel="successor-version"`

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Validation error",
  "errors": [
    { "field": "code", "message": "Code already exists" }
  ]
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "Program not found"
}
```

### 409 Conflict
```json
{
  "status": "fail",
  "message": "Cannot delete program with active enrollments"
}
```

---

## Related Contracts

- [Identity-api-contract.md](Identity-api-contract.md) - Staff/instructor management
- [Enrollment-api-contract.md](Enrollment-api-contract.md) - Program/Class enrollments
- [Content-api-contract.md](Content-api-contract.md) - Course content management
- [Calendar-api-contract.md](Calendar-api-contract.md) - Academic calendar
