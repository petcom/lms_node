# LMS Node API Documentation Index

> **Last Updated:** 2025-01-06  
> **Version:** 2.0 (Post-DCV/EVIP)  
> **API Base URL:** `/api/v1`

## Overview

This document serves as the master index for all LMS Node API documentation. The API has been through two major validation phases:

1. **DCV (Data Consolidation Validation)** - 53 schema changes to consolidate data models
2. **EVIP (Endpoint Validation Implementation Plan)** - 5 phases of endpoint alignment

---

## API Contract Documents

### Core Domains

| Contract | Description | Models |
|----------|-------------|--------|
| [Identity-api-contract.md](Identity-api-contract.md) | Authentication, authorization, user management | User, Admin, Staff, Learner, StaffRole, RefreshToken |
| [Academic-api-contract.md](Academic-api-contract.md) | Organizational and curriculum structure | Department, Program, ProgramLevel, Course, Class, CourseContent |
| [Enrollment-api-contract.md](Enrollment-api-contract.md) | Learner enrollment lifecycle | ProgramEnrollment, ClassEnrollment, CourseEnrollment, CourseEnrollmentCurrent, CourseEnrollmentActivity |
| [Content-api-contract.md](Content-api-contract.md) | Learning content management | CustomContent, CourseContent, Media, MasterTemplate, RenderedCourse |
| [SCORM-api-contract.md](SCORM-api-contract.md) | SCORM package and runtime | ScormPackage, ScormAttempt, ContentAttempt |
| [Assessments-api-contract.md](Assessments-api-contract.md) | Exams, questions, grading | Exam, Question, ExamResult |
| [Calendar-api-contract.md](Calendar-api-contract.md) | Academic calendar | AcademicYear, AcademicTerm, YearGroup |
| [System-api-contract.md](System-api-contract.md) | Platform configuration | Settings, Credential, Lookup, Audit |

---

## Quick Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout current session |
| POST | `/auth/logout-all` | Logout all sessions |
| GET | `/auth/token-info` | Get token information |
| POST | `/password/forgot` | Request password reset |
| PUT | `/password/reset` | Reset password |
| PUT | `/password/change` | Change password |

### User Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/staff/admins/register` | Rate limited | Register admin |
| POST | `/staff/admins/login` | Rate limited | Admin login |
| GET | `/staff/admins/profile` | global-admin | Admin profile |
| POST | `/staff/login` | Rate limited | Staff login |
| GET | `/staff/profile` | staff | Staff profile |
| POST | `/learners/login` | Rate limited | Learner login |
| GET | `/learners/profile` | learner | Learner profile |

### Academic Structure

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/POST | `/departments` | global-admin | List/create departments |
| GET | `/departments/hierarchy` | global-admin | Department tree |
| GET/POST | `/programs` | staff/global-admin | List/create programs |
| GET/POST | `/program-levels` | staff/global-admin | List/create levels |
| GET/POST | `/courses` | staff/global-admin | List/create courses |
| GET/POST | `/course-contents` | staff/global-admin | List/create course content |

### Enrollments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/POST | `/program-enrollments` | global-admin | Program enrollments |
| GET/POST | `/class-enrollments` | global-admin | Class enrollments |
| GET/POST | `/course-enrollments` | global-admin | Course enrollments |
| POST | `/program-enrollments/batch` | global-admin | Batch create program enrollments (V2) |
| POST | `/class-enrollments/batch` | global-admin | Batch create class enrollments (V2) |
| POST | `/course-enrollments/batch` | global-admin | Batch create course enrollments (V2) |
| GET | `/learners/:id/course-history` | global-admin | Unified course history (V2) |

### Content & SCORM

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/content` | staff/global-admin | Unified content catalog |
| POST | `/content/custom` | staff/global-admin | Create custom content |
| GET/POST | `/content/scorm/packages` | staff/global-admin | SCORM packages |
| GET | `/content/scorm/player/:id/launch` | learner | Launch SCORM player |
| POST | `/content/scorm/runtime/:id/*` | learner | SCORM runtime API |

### Assessments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/POST | `/exams` | staff | List/create exams |
| GET/POST | `/questions` | staff | List/create questions |
| GET | `/exam-results` | staff/learner | Exam results |
| POST | `/learners/exams/:id/write` | learner | Submit exam |

### System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET/PUT | `/settings` | global-admin | Platform settings |
| GET | `/permissions/matrix` | global-admin | Permissions matrix |
| GET | `/metrics` | staff/global-admin | System metrics |
| GET | `/health` | none | Health check |

---

## Key Architecture Changes (DCV Summary)

### Email Storage Pattern

Email is stored **only** on the User model:

```javascript
// ✅ Use getEmail() method
const email = await staff.getEmail();

// ❌ Direct field access no longer works
const email = staff.email; // undefined
```

Affected models: Admin, Staff, Learner

### Role System

Users have **roles array** instead of single role:

```typescript
interface User {
  roles: ('learner' | 'staff' | 'global-admin')[];
  primaryRole: string;
  staffRoles: ObjectId[];
}
```

### Department Inheritance

Course and ProgramLevel **inherit department** from Program:

```javascript
// ✅ Use getDepartment() method
const deptId = course.getDepartment();

// ❌ Direct field no longer exists
const deptId = course.department; // undefined
```

### Department Memberships

Staff use **departmentMemberships array**:

```typescript
interface Staff {
  departmentMemberships: Array<{
    departmentId: ObjectId;
    roles: string[];
  }>;
}
```

### Status Standardization

Staff status is now an enum:

```typescript
status: 'active' | 'suspended' | 'withdrawn'
// Replaces: isWithdrawn, isSuspended booleans
```

### CreatedBy Pattern

All entities reference `User` via shared `_id`:

```typescript
{
  createdBy: { type: ObjectId, ref: 'User' }
}
```

---

## Deprecated Endpoints (EVIP Phase 4)

These endpoints are deprecated with sunset date **2026-06-01**:

| Deprecated | Replacement |
|------------|-------------|
| `POST /department-resources/programs` | `POST /programs` |
| `PATCH /department-resources/programs/:id` | `PUT /programs/:id` |
| `POST /department-resources/courses` | `POST /courses` |
| `PATCH /department-resources/courses/:id` | `PUT /courses/:id` |

Deprecated endpoints return RFC 8594 headers:
```
Deprecation: @2025-01-06
Sunset: Tue, 01 Jun 2026 00:00:00 GMT
Link: </api/v1/programs>; rel="successor-version"
```

---

## Batch Operations (EVIP Phase 5)

For efficiency, these patterns support batch operations:

### Batch Enrollment
```javascript
await ProgramEnrollment.insertMany(enrollments);
// Maximum 100 per batch
```

### Bulk Staff Role Update
```javascript
await Staff.bulkWrite([
  { updateOne: { filter: {...}, update: {...} } }
]);
```

### Bulk Course Content Update
```javascript
await CourseContent.bulkWrite([
  { updateOne: { filter: {...}, update: {...} } }
]);
```

---

## Response Format

All API responses follow this structure:

### Success
```json
{
  "status": "success",
  "message": "Operation description",
  "data": { ... }
}
```

### Success with Pagination
```json
{
  "status": "success",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error
```json
{
  "status": "fail",
  "message": "Error description",
  "errors": [
    { "field": "fieldName", "message": "Field error" }
  ]
}
```

---

## Authentication

All authenticated endpoints require:

```
Authorization: Bearer <jwt-token>
```

### Role Requirements

| Role | Access Level |
|------|--------------|
| `global-admin` | Full platform access |
| `staff` | Scoped to department memberships |
| `learner` | Own data and enrolled content |

### Staff Subroles

| Subrole | Permissions |
|---------|-------------|
| `instructor` | Classes, grades, learner progress |
| `department-admin` | Full department management |
| `content-admin` | Content and templates |
| `billing-admin` | Billing and reports |

---

## Rate Limiting

Protected endpoints have rate limits:

| Endpoint Type | Limit |
|---------------|-------|
| Login/Register | 5 per 15 minutes |
| Password Reset | 5 per 15 minutes |
| API General | 100 per minute |

---

## Reference Documents

### Current

| Document | Description |
|----------|-------------|
| [Data_Dictionary.md](Data_Dictionary.md) | Complete field-level documentation |
| [Data_Consolidation_Validation_Implementation.md](Data_Consolidation_Validation_Implementation.md) | DCV implementation details |
| [API_Surface-contract.md](API_Surface-contract.md) | High-level API surface |
| [Person_Types.md](Person_Types.md) | Shared person type definitions |
| [Course_Catalog_ERD.md](Course_Catalog_ERD.md) | Entity relationship diagram |
| [Course_Catalog_Mongo_Mapping.md](Course_Catalog_Mongo_Mapping.md) | MongoDB schema mapping |
| [Staff_Analytics-contract.md](Staff_Analytics-contract.md) | Staff analytics endpoints |
| [Staff_Auth_Dashboard-contract.md](Staff_Auth_Dashboard-contract.md) | Staff dashboard endpoints |

### Archived (in old_devdocs/)

Implementation plans, migration documents, and superseded contracts are archived in the `old_devdocs/` directory.

---

## Test Coverage

- **Total Tests:** 521 passing
- **Test Suites:** 61
- **DCV Tests:** 53 (Phase 1-5)
- **EVIP Tests:** 45 (Phase 1-5)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2025-01-06 | Post-DCV/EVIP - Complete contract overhaul |
| 1.0 | 2025-01-01 | Initial API contracts |
