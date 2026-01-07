# System API Contract

> **Last Updated:** 2025-01-06  
> **Version:** 2.0 (Post-DCV/EVIP)  
> **Status:** Current

Base URL: `/api/v1`

## Overview

The System domain manages platform-wide configuration, permissions, metrics, lookups, credentials, and administrative functions.

## Important Architecture Notes

### Feature Flags (DCV-050)

Settings now includes a `features` Map for feature flag management:

```typescript
interface Settings {
  features: Map<string, boolean>; // Feature flags
  // e.g., { "scormV2": true, "batchEnrollments": true }
}
```

### Credential Model (DCV-031)

New model for managing academic credentials:

```typescript
interface Credential {
  name: string;
  type: 'certificate' | 'diploma' | 'degree' | 'badge';
  program: ObjectId;
  courses: ObjectId[];  // Required courses
  createdBy: ObjectId;  // User reference
}
```

---

## Data Models

### Settings

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `scope` | String | ✓ | Always `global` |
| `pagination` | Object | | Pagination configuration |
| `features` | Map | | Feature flags (DCV-050) |
| `updatedBy` | ObjectId | | Admin who last updated |
| `updatedAt` | Date | | Last update timestamp |

**Pagination Object:**
```typescript
{
  defaultLimit: number;  // Default page size
  maxLimit: number;      // Maximum allowed limit
  overrides: {
    [resourceKey: string]: {
      limit: number;
      maxLimit?: number;
    }
  }
}
```

**Resource Keys:**
- `content`, `scormPackages`, `scormAttempts`, `scormReports`
- `departmentResources`, `staffDashboard`
- `programs`, `programLevels`, `courses`, `courseContents`
- `programEnrollments`, `classEnrollments`, `courseEnrollments`
- `academicYears`, `academicTerms`, `yearGroups`
- `exams`, `questions`, `examResults`, `departments`

### Credential (DCV-031)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `name` | String | ✓ | Credential name |
| `code` | String | ✓ | Unique code |
| `type` | String | ✓ | `certificate`, `diploma`, `degree`, `badge` |
| `description` | String | | Credential description |
| `program` | ObjectId | ✓ | Program reference |
| `courses` | ObjectId[] | | Required courses for completion |
| `requirements` | Object | | Additional requirements |
| `validityPeriod` | Number | | Validity in months (null = permanent) |
| `isActive` | Boolean | ✓ | Active status |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

**Requirements Object:**
```typescript
{
  minCredits?: number;
  minGPA?: number;
  mandatoryCourses?: ObjectId[];
  electiveCourses?: { count: number; from: ObjectId[] };
}
```

### Lookup

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `type` | String | ✓ | Lookup type (staff-roles, course-statuses) |
| `values` | Object[] | ✓ | Lookup values |

### Audit

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Unique identifier |
| `action` | String | ✓ | Action performed |
| `entity` | String | ✓ | Entity type |
| `entityId` | ObjectId | ✓ | Entity ID |
| `userId` | ObjectId | ✓ | User who performed action |
| `changes` | Object | | Before/after values |
| `ipAddress` | String | | Client IP |
| `userAgent` | String | | Client user agent |
| `timestamp` | Date | ✓ | Action timestamp |

---

## Settings Endpoints

### GET `/settings`

Get global settings.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "settings-id",
    "scope": "global",
    "pagination": {
      "defaultLimit": 10,
      "maxLimit": 100,
      "overrides": {
        "content": { "limit": 10, "maxLimit": 50 },
        "scormPackages": { "limit": 10, "maxLimit": 100 },
        "scormAttempts": { "limit": 10, "maxLimit": 100 }
      }
    },
    "features": {
      "scormV2": true,
      "batchEnrollments": true,
      "multiDepartmentStaff": true,
      "credentialTracking": true
    },
    "updatedBy": "admin-id",
    "updatedAt": "2025-01-06T12:00:00Z"
  }
}
```

### PUT `/settings`

Update global settings.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Request Body:**
```json
{
  "pagination": {
    "defaultLimit": 15,
    "maxLimit": 150,
    "overrides": {
      "content": { "limit": 20 },
      "scormPackages": { "limit": 25, "maxLimit": 200 }
    }
  },
  "features": {
    "newFeature": true
  }
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Settings updated",
  "data": { ... }
}
```

**Validation Rules:**
- `pagination.defaultLimit` must be a positive integer
- `pagination.maxLimit` must be >= `defaultLimit`
- `overrides.*.limit` must be a positive integer
- `overrides.*.maxLimit` must be >= override `limit`

---

## Permissions Endpoints

### GET `/permissions/matrix`

Get the permissions matrix for all roles.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "roles": ["global-admin", "staff", "learner"],
    "permissions": {
      "global-admin": [
        "users:create", "users:read", "users:update", "users:delete",
        "departments:create", "departments:read", "departments:update", "departments:delete",
        "programs:create", "programs:read", "programs:update", "programs:delete",
        "settings:read", "settings:update",
        "credentials:create", "credentials:read", "credentials:update", "credentials:delete"
      ],
      "staff": [
        "users:read",
        "programs:read",
        "courses:create", "courses:read", "courses:update",
        "content:create", "content:read", "content:update",
        "scorm:create", "scorm:read", "scorm:update",
        "enrollments:read"
      ],
      "learner": [
        "profile:read", "profile:update",
        "courses:read",
        "content:read",
        "scorm:read",
        "enrollments:read",
        "progress:create", "progress:read"
      ]
    },
    "staffRoles": {
      "instructor": [
        "classes:read",
        "learners:read",
        "grades:create", "grades:read", "grades:update"
      ],
      "department-admin": [
        "staff:create", "staff:read", "staff:update",
        "programs:create", "programs:update",
        "courses:create", "courses:update"
      ],
      "content-admin": [
        "content:create", "content:update", "content:delete",
        "templates:create", "templates:update", "templates:delete"
      ],
      "billing-admin": [
        "billing:read", "billing:update",
        "reports:read"
      ]
    }
  }
}
```

---

## Metrics Endpoints

### GET `/metrics`

Get system metrics summary.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "storage": {
      "usedBytes": 1073741824,
      "usedMB": 1024,
      "usedGB": 1.0
    },
    "sessions": {
      "active": 25,
      "today": 150
    },
    "errors": {
      "recent": [],
      "last24h": 3
    },
    "scorm": {
      "packages": 50,
      "attempts": 5000,
      "activeAttempts": 12
    },
    "users": {
      "learners": 500,
      "staff": 50,
      "admins": 5
    },
    "content": {
      "courses": 100,
      "customContent": 250,
      "templates": 15
    },
    "timestamp": "2025-01-06T12:00:00Z"
  }
}
```

---

## Lookup Endpoints

### GET `/lists/staff-roles`

Get staff role lookup values.

**Headers:** `Authorization: Bearer <token>` (staff or global-admin)

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "role-id-1",
      "name": "instructor",
      "description": "Can teach classes and grade assignments",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    },
    {
      "_id": "role-id-2",
      "name": "department-admin",
      "description": "Full department management access",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    },
    {
      "_id": "role-id-3",
      "name": "content-admin",
      "description": "Manage content and templates",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    },
    {
      "_id": "role-id-4",
      "name": "billing-admin",
      "description": "Access billing and financial data",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### GET `/lists/course-statuses`

Get course status lookup values.

**Headers:** `Authorization: Bearer <token>` (staff or global-admin)

**Response (200):**
```json
{
  "status": "success",
  "data": [
    { "value": "draft", "label": "Draft" },
    { "value": "rendered", "label": "Rendered" },
    { "value": "published", "label": "Published" }
  ]
}
```

---

## Credential Endpoints (DCV-031)

### GET `/credentials`

List credentials.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Query Parameters:**
- `programId` - Filter by program
- `type` - Filter by type (certificate/diploma/degree/badge)
- `isActive` - Filter by active status
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "cred-id",
      "name": "Bachelor of Science in Computer Science",
      "code": "BS-CS",
      "type": "degree",
      "program": { "_id": "prog-id", "name": "Computer Science" },
      "isActive": true,
      "requirements": {
        "minCredits": 120,
        "minGPA": 2.0
      }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 5 }
}
```

### POST `/credentials`

Create a credential.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Request Body:**
```json
{
  "name": "Certificate in Data Science",
  "code": "CERT-DS",
  "type": "certificate",
  "description": "Foundational data science certification",
  "program": "prog-id",
  "courses": ["course-id-1", "course-id-2", "course-id-3"],
  "requirements": {
    "minCredits": 30,
    "mandatoryCourses": ["course-id-1", "course-id-2"]
  },
  "validityPeriod": 24
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Credential created",
  "data": {
    "_id": "new-cred-id",
    "name": "Certificate in Data Science",
    "code": "CERT-DS",
    "type": "certificate",
    "isActive": true
  }
}
```

### GET `/credentials/:id`

Get credential by ID.

### PUT `/credentials/:id`

Update credential.

### DELETE `/credentials/:id`

Delete credential (soft delete - sets isActive to false).

### GET `/credentials/:id/eligible-learners`

Get learners eligible for this credential.

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "learner": { "_id": "learner-id", "name": "John Doe" },
      "progress": {
        "creditsCompleted": 115,
        "creditsRequired": 120,
        "coursesCompleted": 38,
        "coursesRequired": 40,
        "gpa": 3.2
      },
      "eligible": false,
      "missingRequirements": ["5 credits remaining"]
    }
  ]
}
```

### POST `/credentials/:id/award`

Award credential to a learner.

**Request Body:**
```json
{
  "learnerId": "learner-id",
  "awardDate": "2025-06-15",
  "notes": "Graduated with honors"
}
```

---

## Health & Diagnostics

### GET `/health`

Basic health check.

**Response (200):**
```json
{
  "status": "success",
  "message": "OK",
  "timestamp": "2025-01-06T12:00:00Z"
}
```

### GET `/health/detailed`

Detailed health check.

**Headers:** `Authorization: Bearer <token>` (global-admin)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "server": "healthy",
    "database": "healthy",
    "redis": "healthy",
    "scormStorage": "healthy",
    "uptime": 864000,
    "version": "2.0.0",
    "environment": "production"
  }
}
```

---

## Department Resources Endpoints

### GET `/department-resources/staffusers`

List staff users with department assignments.

**Headers:** `Authorization: Bearer <token>` (global-admin or department-admin)

**Query Parameters:**
- `type` - Filter by role (staff/global-admin/instructor/etc.)
- `departmentId` - Filter by department
- `page`, `limit`

**Response (200):**
```json
{
  "status": "success",
  "items": [
    {
      "id": "user-id",
      "name": "Doe, John M.",
      "email": "john@example.com",
      "role": "staff",
      "roles": ["instructor", "content-admin"],
      "departmentMemberships": [
        {
          "department": { "id": "dept-id", "name": "Engineering" },
          "roles": ["instructor", "content-admin"]
        }
      ]
    }
  ]
}
```

### PATCH `/department-resources/staffusers/:id/role`

Update staff roles.

**Request Body:**
```json
{
  "departmentMemberships": [
    { "departmentId": "dept-id", "roles": ["department-admin"] }
  ]
}
```

### PATCH `/department-resources/staffusers/:id/department`

Update staff department assignment.

### GET `/department-resources/content`

List department content.

### POST `/department-resources/content`

Create department content.

### PATCH `/department-resources/content/:id`

Update department content.

### PATCH `/department-resources/departments/:id`

Update department settings.

---

## Deprecated Endpoints (EVIP Phase 4)

The following department-resources endpoints are deprecated:

| Deprecated Endpoint | Replacement | Sunset Date |
|---------------------|-------------|-------------|
| `POST /department-resources/programs` | `POST /programs` | 2026-06-01 |
| `PATCH /department-resources/programs/:id` | `PUT /programs/:id` | 2026-06-01 |
| `POST /department-resources/courses` | `POST /courses` | 2026-06-01 |
| `PATCH /department-resources/courses/:id` | `PUT /courses/:id` | 2026-06-01 |

These endpoints return RFC 8594 deprecation headers:
```
Deprecation: @2025-01-06
Sunset: Tue, 01 Jun 2026 00:00:00 GMT
Link: </api/v1/programs>; rel="successor-version"
```

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Validation error",
  "errors": [
    { "field": "pagination.defaultLimit", "message": "Must be a positive integer" }
  ]
}
```

### 403 Forbidden
```json
{
  "status": "fail",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "Settings not found"
}
```

---

## Related Contracts

- [Identity-api-contract.md](Identity-api-contract.md) - User/Staff management
- [Academic-api-contract.md](Academic-api-contract.md) - Department structure
- [Enrollment-api-contract.md](Enrollment-api-contract.md) - Credential tracking
