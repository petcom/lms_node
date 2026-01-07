# Calendar API Contract

> **Last Updated:** 2025-01-06  
> **Version:** 2.0 (Post-DCV/EVIP)  
> **Status:** Current

Base URL: `/api/v1`

## Overview

The Calendar domain manages the academic calendar: Academic Years, Academic Terms, and Year Groups. These entities provide temporal context for classes, enrollments, and assessments.

## Important Architecture Notes

### Calendar Integration (DCV-024)

Classes now have explicit calendar associations:

```typescript
interface Class {
  academicYear: ObjectId;  // AcademicYear reference
  academicTerm: ObjectId;  // AcademicTerm reference
  // ... other fields
}
```

### CreatedBy References (DCV-053)

All calendar entities reference `User` via the `createdBy` field for consistent auditing.

---

## Data Models

### AcademicYear

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Year name (e.g., "2024-2025") |
| `fromYear` | Date | ✓ | Start date |
| `toYear` | Date | ✓ | End date |
| `isCurrent` | Boolean | | Is the current academic year |
| `createdBy` | ObjectId | ✓ | Admin reference |

### AcademicTerm

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Term name (e.g., "Fall 2024") |
| `description` | String | | Term description |
| `duration` | String | | Duration description |
| `archived` | Boolean | | Archive status |
| `createdBy` | ObjectId | ✓ | Admin reference |

### YearGroup

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Group name |
| `academicYear` | ObjectId | ✓ | AcademicYear reference |
| `createdBy` | ObjectId | ✓ | Admin reference |

---

## Academic Year Endpoints

### GET `/academic-years`

List all academic years.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `isCurrent` - Filter by current status
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "year-id",
      "name": "2024-2025",
      "fromYear": "2024-08-01T00:00:00Z",
      "toYear": "2025-07-31T00:00:00Z",
      "isCurrent": true
    },
    {
      "_id": "year-id-2",
      "name": "2023-2024",
      "fromYear": "2023-08-01T00:00:00Z",
      "toYear": "2024-07-31T00:00:00Z",
      "isCurrent": false
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 5 }
}
```

### POST `/academic-years`

Create a new academic year.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Request Body:**
```json
{
  "name": "2025-2026",
  "fromYear": "2025-08-01",
  "toYear": "2026-07-31",
  "isCurrent": false
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Academic year created",
  "data": {
    "_id": "new-year-id",
    "name": "2025-2026",
    "fromYear": "2025-08-01T00:00:00Z",
    "toYear": "2026-07-31T00:00:00Z",
    "isCurrent": false
  }
}
```

**Validation Rules:**
- `fromYear` must be before `toYear`
- Only one year can have `isCurrent: true` at a time
- Date ranges should not overlap with existing years

### GET `/academic-years/:id`

Get academic year by ID.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "year-id",
    "name": "2024-2025",
    "fromYear": "2024-08-01T00:00:00Z",
    "toYear": "2025-07-31T00:00:00Z",
    "isCurrent": true,
    "terms": [
      { "_id": "term-1", "name": "Fall 2024" },
      { "_id": "term-2", "name": "Spring 2025" }
    ],
    "yearGroups": [
      { "_id": "group-1", "name": "Freshman" }
    ]
  }
}
```

### PUT `/academic-years/:id`

Update academic year.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Request Body:**
```json
{
  "name": "2024-2025 Updated",
  "isCurrent": true
}
```

**Note:** Setting `isCurrent: true` automatically sets all other years to `isCurrent: false`.

### DELETE `/academic-years/:id`

Delete academic year.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Validation:**
- Cannot delete if there are associated classes or enrollments
- Cannot delete the current academic year

---

## Academic Term Endpoints

### GET `/academic-terms`

List all academic terms.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `academicYear` - Filter by academic year
- `includeArchived` - Include archived terms (default: false)
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "term-id",
      "name": "Fall 2024",
      "description": "Fall semester",
      "duration": "4 months",
      "archived": false
    },
    {
      "_id": "term-id-2",
      "name": "Spring 2025",
      "description": "Spring semester",
      "duration": "4 months",
      "archived": false
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 3 }
}
```

### POST `/academic-terms`

Create a new academic term.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Request Body:**
```json
{
  "name": "Summer 2025",
  "description": "Summer intensive session",
  "duration": "2 months"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Academic term created",
  "data": {
    "_id": "new-term-id",
    "name": "Summer 2025",
    "description": "Summer intensive session",
    "duration": "2 months",
    "archived": false
  }
}
```

### GET `/academic-terms/:id`

Get academic term by ID.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "term-id",
    "name": "Fall 2024",
    "description": "Fall semester",
    "duration": "4 months",
    "archived": false,
    "classes": [
      { "_id": "class-1", "name": "CS101 Section A" },
      { "_id": "class-2", "name": "CS101 Section B" }
    ]
  }
}
```

### PUT `/academic-terms/:id`

Update academic term.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Request Body:**
```json
{
  "name": "Fall 2024 Updated",
  "description": "Updated description"
}
```

### DELETE `/academic-terms/:id`

Delete academic term.

**Note:** Soft delete - marks as archived instead of removing.

### PATCH `/academic-terms/:id/archive`

Archive an academic term.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Response (200):**
```json
{
  "status": "success",
  "message": "Academic term archived",
  "data": {
    "_id": "term-id",
    "name": "Fall 2024",
    "archived": true
  }
}
```

### PATCH `/academic-terms/:id/unarchive`

Unarchive an academic term.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Response (200):**
```json
{
  "status": "success",
  "message": "Academic term unarchived",
  "data": {
    "_id": "term-id",
    "name": "Fall 2024",
    "archived": false
  }
}
```

---

## Year Group Endpoints

### GET `/year-groups`

List all year groups.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `academicYear` - Filter by academic year
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "group-id",
      "name": "Freshman",
      "academicYear": {
        "_id": "year-id",
        "name": "2024-2025"
      }
    },
    {
      "_id": "group-id-2",
      "name": "Sophomore",
      "academicYear": {
        "_id": "year-id",
        "name": "2024-2025"
      }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 4 }
}
```

### POST `/year-groups`

Create a new year group.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Request Body:**
```json
{
  "name": "Freshman",
  "academicYear": "year-id"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Year group created",
  "data": {
    "_id": "new-group-id",
    "name": "Freshman",
    "academicYear": "year-id"
  }
}
```

### GET `/year-groups/:id`

Get year group by ID.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "group-id",
    "name": "Freshman",
    "academicYear": {
      "_id": "year-id",
      "name": "2024-2025"
    },
    "learnerCount": 150
  }
}
```

### PUT `/year-groups/:id`

Update year group.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Request Body:**
```json
{
  "name": "First Year",
  "academicYear": "new-year-id"
}
```

### DELETE `/year-groups/:id`

Delete year group.

**Headers:** `Authorization: Bearer <token>` (global-admin required)

**Validation:**
- Cannot delete if there are associated learners

---

## Calendar Context Usage

### Class Calendar Association

When creating or updating a Class, provide academic calendar context:

```json
{
  "name": "CS101 - Section A",
  "program": "prog-id",
  "programLevel": "level-id",
  "department": "dept-id",
  "academicYear": "year-id",
  "academicTerm": "term-id",
  "startDate": "2024-09-01",
  "endDate": "2024-12-15"
}
```

### Exam Calendar Association

Exams can be associated with academic calendar for scheduling:

```json
{
  "name": "Midterm Exam",
  "course": "course-id",
  "academicYear": "year-id",
  "academicTerm": "term-id",
  "examDate": "2024-10-15",
  "examTime": "10:00"
}
```

### Filtering by Calendar

Most list endpoints support filtering by academic calendar:

```
GET /classes?academicYear=year-id&academicTerm=term-id
GET /exams?academicYear=year-id&academicTerm=term-id
GET /program-enrollments?academicYear=year-id
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Validation error",
  "errors": [
    { "field": "fromYear", "message": "Start date must be before end date" }
  ]
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "Academic year not found"
}
```

### 409 Conflict
```json
{
  "status": "fail",
  "message": "Cannot delete academic year with active classes"
}
```

---

## Related Contracts

- [Academic-api-contract.md](Academic-api-contract.md) - Class structure
- [Content-api-contract.md](Content-api-contract.md) - Exam scheduling
- [Enrollment-api-contract.md](Enrollment-api-contract.md) - Term-based enrollments
