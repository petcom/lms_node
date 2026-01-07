# Identity API Contract

> **Last Updated:** 2025-01-06  
> **Version:** 2.0 (Post-DCV/EVIP)  
> **Status:** Current

Base URL: `/api/v1`

## Overview

The Identity domain manages user authentication, authorization, and profile management for all person types in the LMS: Learners, Staff, and Global Admins.

## Important Architecture Notes

### Email Storage Pattern (DCV-021, DCV-039, DCV-041)

Email is stored **only on the User model**, not on individual person models (Learner, Staff, Admin).

```javascript
// ✅ CORRECT - Email comes from User
const email = await learner.getEmail(); // Uses shared User._id

// ❌ WRONG - These fields no longer exist
const email = learner.email;  // undefined
const email = staff.email;    // undefined
const email = admin.email;    // undefined
```

### Role System (DCV-001)

Users now have a **roles array** instead of a single role field:

```typescript
interface User {
  roles: ('learner' | 'staff' | 'global-admin')[];
  primaryRole: 'learner' | 'staff' | 'global-admin';
  staffRoles: StaffRole[];  // For staff subroles
}
```

### Department Memberships (DCV-022)

Staff members use **departmentMemberships array** instead of a single department field:

```typescript
interface Staff {
  departmentMemberships: Array<{
    departmentId: ObjectId;
    roles: ('instructor' | 'department-admin' | 'content-admin' | 'billing-admin')[];
    createdAt: Date;
    updatedAt: Date;
  }>;
  // department: ObjectId; // ❌ REMOVED - use departmentMemberships
}
```

---

## Data Models

### User

The base identity model that all person types reference.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Shared with Learner/Staff/Admin |
| `email` | String | ✓ | Unique email address |
| `password` | String | ✓ | Bcrypt hashed password |
| `roles` | String[] | ✓ | Array of assigned roles |
| `primaryRole` | String | ✓ | Primary role (auto-set from first role) |
| `staffRoles` | ObjectId[] | | StaffRole references for staff |
| `isVerified` | Boolean | | Email verification status |
| `twoFactorEnabled` | Boolean | | 2FA status |
| `loginAttempts` | Number | | Failed login counter |
| `lockUntil` | Date | | Account lock expiry |

### Learner

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Shared with User |
| `name` | Object | ✓ | `{first, middle?, last, honor?}` |
| `addresses` | Object[] | | Address records |
| `hasAgreedToTerms` | Boolean | | Terms acceptance |
| `status` | String | | `active`, `suspended`, `withdrawn` |
| `createdBy` | ObjectId | ✓ | User reference (DCV-053) |

**Removed Fields (DCV-029, DCV-041):**
- ~~`email`~~ → Use `getEmail()` method
- ~~`programEnrolmentStatuses`~~ → Use ProgramEnrollment model

### Staff

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Shared with User |
| `name` | Object | ✓ | `{first, middle?, last, honor?}` |
| `addresses` | Object[] | | Address records |
| `departmentMemberships` | Object[] | ✓ | Department roles (see above) |
| `status` | String | ✓ | `active`, `suspended`, `withdrawn` (DCV-040) |
| `hasAgreedToTerms` | Boolean | | Terms acceptance |
| `createdBy` | ObjectId | ✓ | Admin reference |

**Removed Fields (DCV-021, DCV-022, DCV-036):**
- ~~`email`~~ → Use `getEmail()` method
- ~~`department`~~ → Use `departmentMemberships[]` or `getPrimaryDepartment()`
- ~~`course`~~ → Derive from Class.instructors
- ~~`program`~~ → Derive from Class.program
- ~~`programLevel`~~ → Derive from Class.programLevel
- ~~`examsCreated`~~ → Query Exam by createdBy
- ~~`isWithdrawn`, `isSuspended`~~ → Use `status` enum

**Instance Methods:**
- `getEmail(): Promise<string>` - Returns email from User document
- `getPrimaryDepartment(): ObjectId | null` - Returns first departmentMembership.departmentId

### Admin

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | ✓ | Shared with User |
| `name` | Object | ✓ | `{first, middle?, last, honor?}` |
| `addresses` | Object[] | | Address records |
| `department` | ObjectId | | Primary department |

**Removed Fields (DCV-016, DCV-039):**
- ~~`email`~~ → Use `getEmail()` method
- ~~`programs`, `academicTerms`, `academicYears`, `yearGroups`~~ → Query by createdBy

---

## Authentication Endpoints

### POST `/auth/refresh`

Refresh an access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

### POST `/auth/logout`

Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

### POST `/auth/logout-all`

Invalidate all sessions for the user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "status": "success",
  "message": "All sessions invalidated"
}
```

### GET `/auth/token-info`

Get information about the current token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "userId": "user-id",
    "roles": ["staff"],
    "primaryRole": "staff",
    "expiresAt": "ISO-8601"
  }
}
```

---

## Password Management

### POST `/password/forgot`

Request a password reset email.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Password reset email sent"
}
```

### PUT `/password/reset`

Reset password using token from email.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "new-password"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Password reset successfully"
}
```

### PUT `/password/change`

Change password for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "Password changed successfully"
}
```

### POST `/password/validate`

Validate password strength.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "password": "password-to-validate"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "valid": true,
    "score": 4,
    "feedback": []
  }
}
```

---

## Global Admin Endpoints

### POST `/staff/admins/register`

Register a new global admin.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "name": { "first": "Ada", "last": "Lovelace" },
  "email": "admin@example.com",
  "password": "secure-password"
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Admin registered successfully",
  "data": {
    "_id": "admin-id",
    "name": { "first": "Ada", "last": "Lovelace" },
    "roles": ["global-admin"],
    "primaryRole": "global-admin"
  }
}
```

### POST `/staff/admins/login`

Admin login.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "_id": "admin-id",
      "name": { "first": "Ada", "last": "Lovelace" },
      "roles": ["global-admin"],
      "primaryRole": "global-admin"
    }
  }
}
```

### GET `/staff/admins/profile`

Get current admin profile.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "admin-id",
    "name": { "first": "Ada", "last": "Lovelace" },
    "email": "admin@example.com",
    "department": { "_id": "dept-id", "name": "Master" }
  }
}
```

### PUT `/staff/admins/:id`

Update admin profile.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Request Body:**
```json
{
  "name": { "first": "Ada", "last": "Lovelace-Byron" },
  "email": "new-email@example.com"
}
```

**Note:** Email updates modify the User document, not Admin.

### GET `/staff/admins`

List all admins.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10)

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "admin-id",
      "name": { "first": "Ada", "last": "Lovelace" },
      "email": "admin@example.com"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

---

## Staff Endpoints

### POST `/staff/login`

Staff login.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "staff@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "accessToken": "jwt-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "_id": "staff-id",
      "name": { "first": "John", "last": "Doe" },
      "roles": ["staff"],
      "primaryRole": "staff",
      "departmentMemberships": [
        {
          "departmentId": "dept-id",
          "roles": ["instructor", "content-admin"]
        }
      ]
    }
  }
}
```

### GET `/staff/profile`

Get current staff profile.

**Headers:** `Authorization: Bearer <token>` (staff role required)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "staff-id",
    "name": { "first": "John", "last": "Doe" },
    "email": "staff@example.com",
    "status": "active",
    "departmentMemberships": [
      {
        "department": { "_id": "dept-id", "name": "Engineering" },
        "roles": ["instructor"]
      }
    ]
  }
}
```

### PUT `/staff/:staffId/update`

Update staff profile (self).

**Headers:** `Authorization: Bearer <token>` (staff role required)

**Request Body:**
```json
{
  "name": { "first": "John", "last": "Smith" },
  "password": "new-password"
}
```

**Note:** Email updates not allowed via this endpoint - use password reset.

### POST `/staff/admins/staff/register`

Admin registers a new staff member.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Request Body:**
```json
{
  "name": { "first": "Jane", "last": "Doe" },
  "email": "jane@example.com",
  "password": "temp-password",
  "departmentMemberships": [
    { "departmentId": "dept-id", "roles": ["instructor"] }
  ]
}
```

**Response (201):**
```json
{
  "status": "success",
  "message": "Staff registered successfully",
  "data": {
    "_id": "staff-id",
    "name": { "first": "Jane", "last": "Doe" },
    "departmentMemberships": [...]
  }
}
```

### GET `/staff/admins/staff`

List all staff members.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Query Parameters:**
- `departmentId` - Filter by department
- `status` - Filter by status (active/suspended/withdrawn)
- `page`, `limit`

### GET `/staff/admins/staff/:staffId`

Get staff member by ID.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

### PUT `/staff/admins/staff/:staffId/update`

Admin updates a staff member.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Request Body:**
```json
{
  "name": { "first": "Jane", "last": "Smith" },
  "departmentMemberships": [
    { "departmentId": "dept-id", "roles": ["department-admin"] }
  ],
  "status": "active"
}
```

### GET `/staff/admins/department/:departmentId`

List staff by department.

**Headers:** `Authorization: Bearer <token>` (staff or global-admin role required)

---

## Staff Status Actions

### PUT `/staff/admins/suspend/staff/:id`

Suspend a staff member.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Request Body:**
```json
{
  "reason": "Policy violation"
}
```

### PUT `/staff/admins/unsuspend/staff/:id`

Unsuspend a staff member.

### PUT `/staff/admins/withdraw/staff/:id`

Withdraw a staff member.

### PUT `/staff/admins/unwithdraw/staff/:id`

Reinstate a withdrawn staff member.

---

## Learner Endpoints

### POST `/learners/admins/register`

Admin registers a new learner.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Request Body:**
```json
{
  "name": { "first": "Student", "last": "Name" },
  "email": "student@example.com",
  "password": "temp-password"
}
```

### POST `/learners/login`

Learner login.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "password"
}
```

### GET `/learners/profile`

Get current learner profile.

**Headers:** `Authorization: Bearer <token>` (learner role required)

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "_id": "learner-id",
    "name": { "first": "Student", "last": "Name" },
    "email": "student@example.com",
    "status": "active"
  }
}
```

### PUT `/learners/update`

Update learner profile (self).

**Headers:** `Authorization: Bearer <token>` (learner role required)

**Request Body:**
```json
{
  "name": { "first": "Student", "last": "NewName" },
  "password": "new-password"
}
```

### GET `/learners/admins`

List all learners.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Query Parameters:**
- `status` - Filter by status
- `page`, `limit`

### GET `/learners/:learnerID/admins`

Get learner by ID.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

### PUT `/learners/:learnerID/update/admins`

Admin updates a learner.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

---

## Learner Status Actions

### PUT `/staff/admins/suspend/learner/:id`

Suspend a learner.

**Headers:** `Authorization: Bearer <token>` (global-admin role required)

**Request Body:**
```json
{
  "programId": "program-id",
  "reason": "Academic probation"
}
```

### PUT `/staff/admins/unsuspend/learner/:id`

Unsuspend a learner.

### PUT `/staff/admins/withdraw/learner/:id`

Withdraw a learner.

### PUT `/staff/admins/unwithdraw/learner/:id`

Reinstate a withdrawn learner.

---

## StaffRole Reference

The `StaffRole` model defines available staff subroles:

| Role | Description |
|------|-------------|
| `instructor` | Can teach classes, grade assignments |
| `department-admin` | Full department management |
| `content-admin` | Manage content and templates |
| `billing-admin` | Access billing and financial data |

---

## Error Responses

### 400 Bad Request
```json
{
  "status": "fail",
  "message": "Validation error",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### 401 Unauthorized
```json
{
  "status": "fail",
  "message": "Invalid credentials"
}
```

### 403 Forbidden
```json
{
  "status": "fail",
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "status": "fail",
  "message": "User not found"
}
```

### 429 Too Many Requests
```json
{
  "status": "fail",
  "message": "Too many requests. Please try again later."
}
```

---

## Related Contracts

- [Academic-api-contract.md](Academic-api-contract.md) - Department management
- [Enrollment-api-contract.md](Enrollment-api-contract.md) - Program/Course enrollments
- [System-api-contract.md](System-api-contract.md) - Settings and permissions
