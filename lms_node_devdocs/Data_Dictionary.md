# LMS Data Dictionary

> **Generated**: January 5, 2026  
> **Purpose**: Complete field-level documentation for all MongoDB collections

---

## Important Conventions

### DCV-053: createdBy References User Model

As of the DCV-053 implementation, **all `createdBy` fields now reference the `User` model** instead of `Admin` or `Staff`. This works seamlessly with the shared `_id` pattern (User._id === Staff._id === Admin._id) established in DCV-001.

**Affected models**: Program, Course, ProgramLevel, CourseContent, CustomContent, Exam, Question, ScormPackage, Media, Credential

> **Note**: Some entries below may still show `ref: Admin` or `ref: Staff` for historical reference, but the actual schema uses `ref: User`.

---

## Table of Contents

1. [Authentication Models](#authentication-models)
2. [Person Models](#person-models)
3. [Academic Structure Models](#academic-structure-models)
4. [Content Models](#content-models)
5. [Enrollment Models](#enrollment-models)
6. [Progress & Assessment Models](#progress--assessment-models)
7. [SCORM Models](#scorm-models)
8. [System Models](#system-models)

---

## Authentication Models

### User

**Collection**: `users`  
**File**: `model/Auth/User.ts`  
**Purpose**: Authentication credentials and account status for all user types

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key (shared with Admin/Staff/Learner) |
| `email` | String | ✅ | - | Unique index | Login email address |
| `username` | String | - | - | Unique, sparse | Alternative login identifier |
| `passwordHash` | String | ✅ | - | - | Bcrypt hashed password |
| `roles` | [String] | ✅ | - | enum: `global-admin`, `staff`, `learner`; min 1 | Role types (supports multi-role) |
| `primaryRole` | String | - | roles[0] | enum: same as roles | Default dashboard after login |
| `staffRoles` | [String] | - | undefined | - | Staff permission roles (e.g., instructor, department-admin) |
| `status` | String | - | `active` | enum: `active`, `inactive`, `archived`, `deleted` | Account status |
| `emailVerified` | Boolean | - | false | - | Email verification status |
| `emailVerifiedAt` | Date | - | null | - | When email was verified |
| `lastLoginAt` | Date | - | null | - | Most recent login timestamp |
| `passwordUpdatedAt` | Date | - | null | - | Last password change |
| `createdAt` | Date | Auto | - | - | Record creation time |
| `updatedAt` | Date | Auto | - | - | Last modification time |

**Indexes**: `email (unique)`, `username (unique, sparse)`, `roles`

**Notes**:
- `roles` replaces deprecated `role` field (DCV-001)
- `staffRoles` replaces deprecated `subroles` field (DCV-001)
- `primaryRole` auto-set from `roles[0]` if not provided

---

### RefreshToken

**Collection**: `refreshtokens`  
**File**: `model/Auth/RefreshToken.ts`  
**Purpose**: JWT refresh token storage for session management

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `token` | String | ✅ | - | Unique | The refresh token value |
| `userId` | ObjectId | ✅ | - | - | Reference to user |
| `userType` | String | ✅ | - | enum: `global-admin`, `staff`, `learner` | User role type |
| `expiresAt` | Date | ✅ | - | TTL: 7 days | Token expiration |
| `isUsed` | Boolean | - | false | - | If token was consumed |
| `isRevoked` | Boolean | - | false | - | If manually revoked |
| `deviceInfo.userAgent` | String | - | - | - | Browser/client info |
| `deviceInfo.ipAddress` | String | - | - | - | Client IP address |
| `createdAt` | Date | Auto | - | - | Token creation time |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### TokenBlacklist

**Collection**: `tokenblacklists`  
**File**: `model/Auth/TokenBlacklist.ts`  
**Purpose**: Invalidated tokens for logout and security

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `token` | String | ✅ | - | Unique | Blacklisted token |
| `userId` | ObjectId | ✅ | - | - | Token owner |
| `userType` | String | ✅ | - | enum: `global-admin`, `staff`, `learner` | User type |
| `reason` | String | - | `logout` | enum: `logout`, `password_change`, `token_refresh`, `security_breach`, `manual_revocation` | Blacklist reason |
| `expiresAt` | Date | ✅ | - | TTL index | Auto-cleanup time |
| `createdAt` | Date | Auto | - | - | Blacklist time |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

## Person Models

### Admin

**Collection**: `admins`  
**File**: `model/Staff/Admin.ts`  
**Purpose**: Global administrators with full system access

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | Must match User._id | Primary key (shared with User) |
| `name.first` | String | ✅ | - | - | First name |
| `name.middle` | String | - | - | - | Middle name |
| `name.last` | String | ✅ | - | - | Last name |
| `name.display` | String | - | Auto | - | Formatted: "Last, First M." |
| `department` | ObjectId | - | - | ref: Department | Primary department |
| `addresses` | [Address] | - | undefined | - | Mailing addresses |
| `honor.sex` | String | - | - | - | Biological sex |
| `honor.gender` | String | - | - | - | Gender identity |
| `honor.pronouns` | String | - | - | - | Preferred pronouns |
| `honor.honorific` | String | - | - | - | Title (Dr., Mr., etc.) |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Removed Fields (DCV-016, DCV-039)**:
- `email` - Derive from User via `getEmail()` method (DCV-039)
- `academicTerms`, `programs`, `yearGroups`, `academicYears`, `programLevels`, `courses`, `instructors`, `learners` - Global admins access all via role authorization (DCV-016)

**Instance Methods**:
- `getEmail()` - Fetches email from User collection

**Pre-save Validation**: Requires matching User to exist (DCV-003)

---

### Staff

**Collection**: `staffs`  
**File**: `model/Staff/Staff.ts`  
**Purpose**: Instructors, department admins, and other staff roles

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | Must match User._id | Primary key (shared with User) |
| `name.first` | String | ✅ | - | - | First name |
| `name.middle` | String | - | - | - | Middle name |
| `name.last` | String | ✅ | - | - | Last name |
| `name.display` | String | - | Auto | - | Formatted display name |
| `dateEmployed` | Date | - | Date.now | - | Employment start date |
| `instructorId` | String | ✅ | Auto | - | Display ID (TEA###...) |
| `status` | String | - | `active` | enum: `active`, `suspended`, `withdrawn` | Staff status (DCV-040) |
| `departmentMemberships` | [Membership] | - | undefined | - | Multi-department roles |
| `departmentMemberships[].departmentId` | ObjectId | ✅ | - | ref: Department | Department reference |
| `departmentMemberships[].roles` | [String] | - | [] | - | Roles in that department |
| `addresses` | [Address] | - | undefined | - | Contact addresses |
| `honor` | Object | - | undefined | - | Demographics (same as Admin) |
| `applicationStatus` | String | - | `pending` | enum: `pending`, `approved`, `rejected` | Onboarding status |
| `createdBy` | ObjectId | - | - | ref: Admin | Who created this record |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Removed Fields (DCV-021-023, DCV-036, DCV-040)**:
- `email` - Derive from User via `getEmail()` method
- `department` - Use `departmentMemberships[0].departmentId` via `primaryDepartment` virtual
- `academicYear` - Context comes from Calendar/Class, not Staff
- `course` - Use Course.primaryInstructors/assistantInstructors instead
- `program` - Query courses to find program assignments
- `programLevel` - Query courses to find program level assignments
- `examsCreated` - Query Exam.find({ createdBy: staffId }) instead
- `isWithdrawn` - Replaced by `status: 'withdrawn'` (DCV-040)
- `isSuspended` - Replaced by `status: 'suspended'` (DCV-040)

**Virtual Getters**:
- `primaryDepartment` - Returns first department membership's departmentId

**Instance Methods**:
- `getEmail()` - Fetches email from User collection
- `getPrimaryDepartment()` - Returns first department membership's departmentId

**Pre-save Validation**: Requires matching User to exist (DCV-004)

---

### StaffRole

**Collection**: `staffroles`  
**File**: `model/Staff/StaffRole.ts`  
**Purpose**: Lookup table for staff role definitions

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | Unique, trimmed | Role name |
| `description` | String | - | '' | - | Role description |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### Learner

**Collection**: `learners`  
**File**: `model/Academic/Learner.ts`  
**Purpose**: Students enrolled in programs

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | Must match User._id | Primary key (shared with User) |
| `name.first` | String | ✅ | - | - | First name |
| `name.middle` | String | - | - | - | Middle name |
| `name.last` | String | ✅ | - | - | Last name |
| `name.display` | String | - | Auto | - | Formatted display name |
| `dateAdmitted` | Date | - | Date.now | - | When admitted |
| `learnerId` | String | ✅ | Auto | Unique | Display ID (LRN###...) |
| `addresses` | [Address] | - | undefined | - | Contact addresses |
| `honor` | Object | - | undefined | - | Demographics |
| `globalStatus` | String | - | `active` | enum: `active`, `inactive` | Account status |
| `programEnrolmentStatuses` | [Object] | - | - | - | ⚠️ Embedded enrollment status |
| `programEnrolmentStatuses[].programId` | ObjectId | ✅ | - | ref: Program | Program reference |
| `programEnrolmentStatuses[].status` | String | ✅ | - | enum: `active`, `withdrawn`, `suspended` | Enrollment status |
| `programEnrolmentStatuses[].statusReason` | String | - | - | - | Reason for status |
| `programEnrolmentStatuses[].statusUpdatedAt` | Date | - | - | - | When status changed |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Removed Fields (DCV-041)**:
- `email` - Derive from User via `getEmail()` method

**Instance Methods**:
- `getEmail()` - Fetches email from User collection

**Indexes**: `learnerId (unique)`, `globalStatus`, `createdAt`

**Pre-save Validation**: Requires matching User to exist (DCV-005)

---

## Academic Structure Models

### Department

**Collection**: `departments`  
**File**: `model/Academic/Department.ts`  
**Purpose**: Organizational units for programs and staff

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | - | Department name |
| `code` | String | - | - | Unique, sparse | Short code (e.g., "MET") |
| `level` | String | ✅ | - | enum: `master`, `top`, `sub` | Hierarchy level |
| `parent` | ObjectId | - | null | ref: Department | Parent department |
| `ancestors` | [ObjectId] | - | - | ref: Department | Full ancestor path |
| `passingStyleScore` | Number | - | null | min: 0, max: 100 | Default passing % |
| `status` | String | - | `active` | enum: `active`, `archived` | Department lifecycle (DCV-042) |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**: `level`, `parent`, `(name, parent) unique`, `status`

---

### Program

**Collection**: `programs`  
**File**: `model/Academic/Program.ts`  
**Purpose**: Academic programs containing levels and courses

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | - | Program name |
| `description` | String | ✅ | - | - | Program description |
| `code` | String | - | Auto | - | Short code |
| `createdBy` | ObjectId | ✅ | - | ref: Admin | Creator |
| `department` | ObjectId | ✅ | - | ref: Department | Owning department |
| `archived` | Boolean | - | false | - | Soft delete flag |
| `archivedAt` | Date | - | - | - | When archived |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Removed Fields (DCV-013-015, DCV-043)**:
- `learners` - Derive from ProgramEnrollment via `getLearners()` method
- `instructors` - Derive from Course.primaryInstructors via `getInstructors()` method
- `courses` - Derive from Course.find({ program }) via `getCourses()` method
- `duration` - Now tracked at Class level (DCV-043)

**Instance Methods**:
- `getLearners()` - Returns enrolled learners from ProgramEnrollment
- `getInstructors()` - Returns instructors from Course assignments
- `getCourses()` - Returns courses in this program
- `getLearnerCount()` - Optimized count query
- `getCourseCount()` - Optimized count query

---

### ProgramLevel

**Collection**: `programlevels`  
**File**: `model/Academic/ProgramLevel.ts`  
**Purpose**: Sub-divisions within a program (semesters, modules, etc.)

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `program` | ObjectId | ✅ | - | ref: Program | Parent program |
| `courses` | [ObjectId] | - | - | ref: Course | Courses at this level |
| `name` | String | ✅ | - | - | Level name |
| `description` | String | - | - | - | Level description |
| `order` | Number | ✅ | - | min: 1 | Sequence order |
| `archived` | Boolean | - | false | - | Soft delete flag |
| `archivedAt` | Date | - | - | - | When archived |
| `createdBy` | ObjectId | ✅ | - | ref: Admin | Creator |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Removed Fields (DCV-044)**:
- `department` - Inherit from Program via `getDepartment()` method

**Instance Methods**:
- `getDepartment()` - Returns department from parent Program

**Indexes**: `program`, `(program, order) unique`, `(program, archived)`

---

### AcademicYear

**Collection**: `academicyears`  
**File**: `model/Academic/AcademicYear.ts`  
**Purpose**: Academic year periods

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | Unique | Year name (e.g., "2025-2026") |
| `fromYear` | Date | ✅ | - | - | Start date |
| `toYear` | Date | ✅ | - | - | End date |
| `isCurrent` | Boolean | - | false | - | Currently active year |
| `createdBy` | ObjectId | ✅ | - | ref: Admin | Creator |
| `learners` | [ObjectId] | - | - | ref: Learner | Enrolled learners |
| `instructors` | [ObjectId] | - | - | ref: Staff | Active instructors |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### AcademicTerm

**Collection**: `academicterms`  
**File**: `model/Academic/AcademicTerm.ts`  
**Purpose**: Terms/semesters within academic years

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | - | Term name |
| `description` | String | ✅ | - | - | Term description |
| `duration` | String | ✅ | `3 months` | - | Duration text |
| `createdBy` | ObjectId | ✅ | - | ref: Admin | Creator |
| `archived` | Boolean | - | false | - | Soft delete flag |
| `archivedAt` | Date | - | - | - | When archived |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### Class

**Collection**: `classes`  
**File**: `model/Academic/Class.ts`  
**Purpose**: Class sections within program levels - cohorts of learners moving through a program together
**DCV-024**: Documented Class model definition and Calendar integration

> A **Class** is a group of students attending a program (or program level) at the same time. Classes exist within AcademicTerms which are part of AcademicYears. Staff academic year context comes from their Class assignments.

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | - | Class name |
| `program` | ObjectId | ✅ | - | ref: Program | Parent program |
| `programLevel` | ObjectId | ✅ | - | ref: ProgramLevel | Parent level |
| `department` | ObjectId | - | - | ref: Department | Department |
| `academicYear` | ObjectId | - | - | ref: AcademicYear | Calendar year (DCV-024) |
| `academicTerm` | ObjectId | - | - | ref: AcademicTerm | Calendar term (DCV-024) |
| `instructors` | [ObjectId] | - | - | ref: Staff | Class instructors |
| `startDate` | Date | - | - | - | Class start date |
| `endDate` | Date | - | - | - | Class end date |
| `duration` | String | - | - | - | Class duration (DCV-043: moved from Program) |
| `createdBy` | ObjectId | ✅ | - | ref: User | Creator (DCV-053) |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**:
- `{ program: 1, programLevel: 1, createdAt: -1 }`
- `{ department: 1, createdAt: -1 }`
- `{ academicYear: 1, academicTerm: 1 }` (DCV-024)

**Calendar Integration**:
- `academicYear`: Links to the AcademicYear this class runs in
- `academicTerm`: Optionally links to a specific term (for term-based programs)
- `startDate`/`endDate`: Actual class dates (may differ from term dates)

---

### Credential

**Collection**: `credentials`  
**File**: `model/Academic/Credential.ts`  
**Purpose**: Certificates, degrees, and diplomas that learners can earn
**DCV-031**: New model for credential tracking

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | - | Credential name |
| `description` | String | - | - | - | Credential description |
| `type` | String | ✅ | - | enum: certificate, degree, diploma | Credential type |
| `program` | ObjectId | ✅ | - | ref: Program | Associated program |
| `createdBy` | ObjectId | ✅ | - | ref: User | Creator (DCV-053) |
| `status` | String | - | `draft` | enum: draft, active, archived | Credential status |
| `requirements` | Array | - | - | - | Completion requirements |
| `requirements.description` | String | ✅ | - | - | Requirement description |
| `requirements.minCredits` | Number | - | - | - | Minimum credits needed |
| `requirements.minScore` | Number | - | - | - | Minimum score needed |
| `requirements.requiredCourses` | Array<ObjectId> | - | - | ref: Course | Required courses |
| `totalCreditsRequired` | Number | - | - | - | Total credits for credential |
| `validityMonths` | Number | - | - | - | Certificate validity period |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**:
- `{ program: 1, type: 1 }`
- `{ status: 1 }`

---

### YearGroup

**Collection**: `yeargroups`  
**File**: `model/Academic/YearGroup.ts`  
**Purpose**: Cohort groupings by year

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | - | Group name |
| `createdBy` | ObjectId | ✅ | - | ref: Admin | Creator |
| `academicYear` | ObjectId | ✅ | - | ref: AcademicYear | Associated year |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

## Content Models

### Course

**Collection**: `courses`  
**File**: `model/Content/Course.ts`  
**Purpose**: Individual courses within programs

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `title` | String | ✅ | - | - | Course title |
| `shortDescription` | String | - | - | max: 500 | Brief summary |
| `longDescription` | String | - | - | max: 5000 | Full description |
| `program` | ObjectId | ✅ | - | ref: Program | Parent program |
| `programLevel` | ObjectId | - | - | ref: ProgramLevel | Parent level |
| `isArchived` | Boolean | - | false | - | Soft delete flag |
| `status` | String | - | `draft` | enum: `draft`, `rendered`, `published` | Publication status |
| `publishedAt` | Date | - | - | - | When published |
| `publishedBy` | ObjectId | - | - | ref: Staff | Publisher |
| `primaryInstructors` | [ObjectId] | - | - | ref: Staff | Main instructors |
| `secondaryInstructors` | [ObjectId] | - | - | ref: Staff | Assistant instructors |
| `archivedAt` | Date | - | - | - | When archived |
| `createdBy` | ObjectId | ✅ | - | ref: Admin | Creator |
| `defaultGradingPolicy` | Object | - | `{ type: 'final-attempt' }` | - | Default grading policy for course content (DCV-035) |
| `defaultGradingPolicy.type` | String | - | `final-attempt` | enum: `final-attempt`, `best-attempt`, `average-all`, `average-last-n` | Grading strategy |
| `defaultGradingPolicy.averageCount` | Number | - | - | - | Number of attempts for `average-last-n` |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Removed Fields (DCV-037, DCV-044)**:
- `description` - Use `shortDescription` and `longDescription` instead
- `department` - Inherit from Program via `getDepartment()` method

**Instance Methods**:
- `getDepartment()` - Returns department from parent Program

**Indexes**: `program`, `(program, programLevel)`, `isArchived`

---

### CourseContent

**Collection**: `coursecontents`  
**File**: `model/Academic/CourseContent.ts`  
**Purpose**: Content segments within a course

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `course` | ObjectId | ✅ | - | ref: Course | Parent course |
| `title` | String | - | - | - | Segment title (DCV-045) |
| `shortDescription` | String | - | - | - | Brief summary |
| `longDescription` | String | - | - | - | Full description |
| `contentType` | String | ✅ | - | enum: `scorm`, `custom` | Content type |
| `scormPackageId` | ObjectId | - | - | ref: ScormPackage | SCORM reference |
| `customContentId` | ObjectId | - | - | ref: CustomContent | Custom content ref |
| `order` | Number | ✅ | - | min: 1 | Display order |
| `isRequired` | Boolean | - | true | - | Mandatory completion |
| `createdBy` | ObjectId | ✅ | - | ref: Admin | Creator |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**: `course`, `(course, order) unique`, `(course, contentType)`

---

### CustomContent

**Collection**: `customcontents`  
**File**: `model/Content/CustomContent.ts`  
**Purpose**: Non-SCORM content (quizzes, exercises, etc.)

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `title` | String | ✅ | - | - | Content title |
| `customType` | String | ✅ | - | enum: `exam`, `quiz`, `exercise`, `custom` | Content type (DCV-046: 'scorm' removed) |
| `payload` | Mixed | - | - | - | Type-specific data |
| `html` | String | - | - | - | Rendered HTML content |
| `css` | String | - | - | - | Custom styling |
| `department` | ObjectId | - | - | ref: Department | Owning department |
| `questions` | [ObjectId] | - | - | ref: Question | Questions for quiz/exam types (DCV-047) |
| `createdBy` | ObjectId | ✅ | - | ref: Admin | Creator |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**: `title`

---

### RenderedCourse

**Collection**: `renderedcourses`  
**File**: `model/Content/RenderedCourse.ts`  
**Purpose**: Pre-rendered course HTML for delivery

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `courseId` | ObjectId | ✅ | - | ref: Course | Source course |
| `contentVersion` | Date | ✅ | - | - | Version timestamp |
| `html` | String | ✅ | - | - | Rendered HTML |
| `css` | String | - | - | - | Rendered CSS (DCV-048) |
| `version` | Number | - | 1 | - | Numeric version for cache busting (DCV-048) |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### Media

**Collection**: `medias`  
**File**: `model/Content/Media.ts`  
**Purpose**: External hosted content (videos, audio, documents, images, embeds)
**DCV-051**: New model for external content references

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | - | Media name |
| `description` | String | - | - | - | Media description |
| `type` | String | ✅ | - | enum: video, audio, document, image, embed | Media type |
| `url` | String | ✅ | - | - | External URL |
| `department` | ObjectId | ✅ | - | ref: Department | Owning department |
| `createdBy` | ObjectId | ✅ | - | ref: User | Creator (DCV-053) |
| `status` | String | - | `draft` | enum: draft, published, archived | Media status |
| `durationSeconds` | Number | - | - | - | Duration for video/audio |
| `mimeType` | String | - | - | - | MIME type |
| `fileSize` | Number | - | - | - | File size in bytes |
| `thumbnailUrl` | String | - | - | - | Thumbnail image URL |
| `embedCode` | String | - | - | - | HTML embed code |
| `provider` | String | - | - | - | Provider name (YouTube, Vimeo, etc.) |
| `providerId` | String | - | - | - | Provider-specific ID |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**:
- `{ department: 1, type: 1 }`
- `{ department: 1, status: 1 }`
- `{ createdBy: 1 }`

---

### MasterTemplate

**Collection**: `mastertemplates`  
**File**: `model/Content/MasterTemplate.ts`  
**Purpose**: Course layout templates

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | trimmed | Template name |
| `description` | String | - | '' | - | Template description |
| `type` | String | ✅ | - | enum: `scorm`, `custom`, `hybrid` | Template type |
| `departmentId` | ObjectId | - | - | ref: Department | Owning department |
| `isGlobal` | Boolean | - | false | - | Available to all depts |
| `css` | String | - | '' | - | Template styling |
| `layout.grid` | String | - | '' | - | Grid CSS |
| `layout.regions` | [Object] | - | [] | - | Layout regions |
| `score.value` | Number | - | 0 | - | CSS diff score |
| `score.comparedToVersion` | Number | - | 0 | - | Version compared |
| `score.diffs` | [Object] | - | [] | - | CSS differences |
| `overrideStatus` | String | - | `inherited` | enum: `inherited`, `pending`, `approved` | Override status |
| `status` | String | - | `draft` | enum: `draft`, `published`, `archived` | Template status |
| `createdBy` | ObjectId | ✅ | - | ref: Admin | Creator |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### DepartmentMasterCSS

**Collection**: `departmentmastercsses`  
**File**: `model/Content/DepartmentMasterCSS.ts`  
**Purpose**: Department-specific CSS overrides

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `departmentId` | ObjectId | ✅ | - | ref: Department, unique | Department |
| `css` | String | ✅ | - | - | CSS content |
| `version` | Number | ✅ | 1 | - | Version number |
| `updatedBy` | ObjectId | ✅ | - | ref: Admin | Last editor |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

## Enrollment Models

### ProgramEnrollment

**Collection**: `programenrollments`  
**File**: `model/Academic/ProgramEnrollment.ts`  
**Purpose**: Learner enrollment lifecycle tracking with credential goals (DCV-026 redesign)

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `learner` | ObjectId | ✅ | - | ref: Learner | Enrolled learner |
| `program` | ObjectId | ✅ | - | ref: Program | Target program |
| `credentialGoal` | String | - | `none` | enum: `certificate`, `degree`, `none` | What learner is working toward |
| `targetCredential` | ObjectId | - | - | ref: Credential | Specific credential being pursued |
| `currentProgramLevel` | ObjectId | - | - | ref: ProgramLevel | Current level (null for single-course) |
| `status` | String | - | `applied` | enum: `applied`, `enrolled`, `on-leave`, `withdrawn`, `completed` | Enrollment status |
| `statusHistory` | Array | - | [] | - | Full audit trail of status changes |
| `statusHistory[].status` | String | ✅ | - | enum: same as status | Status value |
| `statusHistory[].reason` | String | - | - | - | Reason for change |
| `statusHistory[].changedBy` | ObjectId | - | - | ref: User | Who made the change |
| `statusHistory[].changedAt` | Date | - | Date.now | - | When change occurred |
| `enrolledAt` | Date | ✅ | Date.now | - | Initial enrollment date |
| `completedAt` | Date | - | - | - | Program completion date |
| `withdrawnAt` | Date | - | - | - | Withdrawal date |
| `leaveReason` | String | - | - | - | Reason for leave of absence |
| `leaveStartDate` | Date | - | - | - | When leave started |
| `expectedReturnDate` | Date | - | - | - | Expected return from leave |
| `completionType` | String | - | - | enum: `with-certificate`, `with-degree`, `coursework-only`, `incomplete` | How program was completed |
| `withdrawalReason` | String | - | - | - | Reason for withdrawal |
| `withdrawnBy` | ObjectId | - | - | ref: User | Who initiated withdrawal |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**: `learner`, `program`, `(learner, program) unique`, `(program, status)`, `(learner, status)`, `(credentialGoal, targetCredential)`

**Notes**:
- DCV-026: Complete redesign with credential goal tracking and expanded status lifecycle
- Status workflow: applied → enrolled → (on-leave ↔) → completed/withdrawn
- `statusHistory` provides complete audit trail for all status changes
- Replaces deprecated Learner.programEnrolmentStatuses array (DCV-029)

---

### CourseEnrollmentCurrent

**Collection**: `courseenrollmentcurrents`  
**File**: `model/Academic/CourseEnrollmentCurrent.ts`  
**Purpose**: Track active course enrollments with progress (DCV-027)

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `learner` | ObjectId | ✅ | - | ref: Learner | Enrolled learner |
| `course` | ObjectId | ✅ | - | ref: Course | Target course |
| `programEnrollment` | ObjectId | ✅ | - | ref: ProgramEnrollment | Links to program for credential tracking |
| `enrolledAt` | Date | ✅ | Date.now | - | Course enrollment date |
| `progress` | Object | - | {} | - | Progress tracking container |
| `progress.examAttempts` | Array | - | [] | - | Exam attempt records |
| `progress.examAttempts[].examId` | ObjectId | ✅ | - | ref: Exam | Exam reference |
| `progress.examAttempts[].examType` | String | - | - | enum: `quiz`, `midterm`, `final`, `assignment`, `practice` | Exam type |
| `progress.examAttempts[].attemptNumber` | Number | ✅ | - | min: 1 | Attempt number |
| `progress.examAttempts[].points` | Number | - | - | - | Points earned |
| `progress.examAttempts[].maxPoints` | Number | - | - | - | Maximum points |
| `progress.examAttempts[].percentage` | Number | - | - | - | Score percentage |
| `progress.examAttempts[].attemptedAt` | Date | - | Date.now | - | When attempted |
| `progress.examAttempts[].timeSpent` | Number | - | - | - | Time in seconds |
| `progress.mediaProgress` | Array | - | [] | - | Media viewing progress |
| `progress.mediaProgress[].mediaId` | ObjectId | ✅ | - | ref: Media | Media reference |
| `progress.mediaProgress[].viewedMinutes` | Number | - | 0 | - | Minutes watched |
| `progress.mediaProgress[].requiredMinutes` | Number | - | - | - | Required viewing time |
| `progress.mediaProgress[].verified` | Boolean | - | false | - | Viewing verified |
| `progress.mediaProgress[].lastViewedAt` | Date | - | - | - | Last activity |
| `progress.scormAttempts` | Array | - | [] | - | SCORM package attempts |
| `progress.scormAttempts[].scormPackageId` | ObjectId | ✅ | - | ref: ScormPackage | SCORM reference |
| `progress.scormAttempts[].attemptNumber` | Number | ✅ | - | min: 1 | Attempt number |
| `progress.scormAttempts[].score` | Number | - | - | - | Raw score |
| `progress.scormAttempts[].scaledScore` | Number | - | - | 0.0-1.0 | Normalized score |
| `progress.scormAttempts[].completionStatus` | String | - | `unknown` | enum: `unknown`, `not-attempted`, `incomplete`, `completed` | SCORM completion |
| `progress.scormAttempts[].successStatus` | String | - | `unknown` | enum: `unknown`, `passed`, `failed` | SCORM success |
| `progress.scormAttempts[].attemptedAt` | Date | - | Date.now | - | When attempted |
| `progress.scormAttempts[].timeSpent` | Number | - | - | - | Time in seconds |
| `lastActivityAt` | Date | - | Date.now | - | Last activity timestamp |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**: `(learner, course) unique`, `programEnrollment`, `(learner, lastActivityAt desc)`

**Notes**:
- DCV-027: New model for active course enrollments
- **Temporary record**: Deleted when course ends (moved to CourseEnrollmentActivity)
- Links to ProgramEnrollment for credential progress tracking
- Replaces deprecated LearnerProgress model (DCV-052)

---

### CourseEnrollmentActivity

**Collection**: `courseenrollmentactivities`  
**File**: `model/Academic/CourseEnrollmentActivity.ts`  
**Purpose**: Permanent record of completed/withdrawn course enrollments (DCV-028)

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `learner` | ObjectId | ✅ | - | ref: Learner | Learner who completed/withdrew |
| `course` | ObjectId | ✅ | - | ref: Course | Completed course |
| `programEnrollment` | ObjectId | ✅ | - | ref: ProgramEnrollment | Links to program for credential tracking |
| `outcome` | String | ✅ | - | enum: `passed`, `failed`, `withdrawn` | Final outcome |
| `enrolledAt` | Date | - | - | - | When originally enrolled |
| `completedAt` | Date | - | Date.now | - | When course ended |
| `finalScoring` | Object | - | - | - | Final scoring breakdown |
| `finalScoring.totalPoints` | Number | - | - | - | Total points earned |
| `finalScoring.maxPoints` | Number | - | - | - | Maximum possible points |
| `finalScoring.percentage` | Number | - | - | - | Final percentage |
| `finalScoring.exams` | Object | - | - | - | Exam scoring breakdown |
| `finalScoring.media` | Object | - | - | - | Media scoring breakdown |
| `finalScoring.scorm` | Object | - | - | - | SCORM scoring breakdown |
| `attemptHistory` | Object | - | - | - | Complete attempt history from CourseEnrollmentCurrent |
| `attemptHistory.examAttempts` | Array | - | [] | - | All exam attempts |
| `attemptHistory.mediaProgress` | Array | - | [] | - | Final media progress |
| `attemptHistory.scormAttempts` | Array | - | [] | - | All SCORM attempts |
| `creditsEarned` | Number | - | 0 | - | Credits earned for passed course |
| `visibleToLearner` | Boolean | - | true | - | Whether learner can see in transcript |
| `withdrawalReason` | String | - | - | - | Reason if withdrawn |
| `withdrawnBy` | ObjectId | - | - | ref: User | Who initiated withdrawal |
| `notes` | String | - | - | - | Instructor/admin notes |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**: `(learner, outcome)`, `programEnrollment`, `(course, outcome)`, `(learner, visibleToLearner, completedAt desc)`

**Notes**:
- DCV-028: New model for permanent course completion history
- **Permanent record**: Never deleted - serves as audit log
- Created by moving data from CourseEnrollmentCurrent when course ends (DCV-032)
- `creditsEarned` accumulates toward credential requirements

---

### CourseEnrollment (Legacy)

**Collection**: `courseenrollments`  
**File**: `model/Academic/CourseEnrollment.ts`  
**Purpose**: Learner enrollment in courses (DEPRECATED - see CourseEnrollmentCurrent/Activity)

> **⚠️ Deprecation Notice**: This model is being replaced by CourseEnrollmentCurrent and CourseEnrollmentActivity as part of DCV-027/028. New code should use the new models.

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `learner` | ObjectId | ✅ | - | ref: Learner | Enrolled learner |
| `course` | ObjectId | ✅ | - | ref: Course | Target course |
| `program` | ObjectId | ✅ | - | ref: Program | Parent program |
| `programLevel` | ObjectId | - | - | ref: ProgramLevel | Parent level |
| `class` | ObjectId | - | - | ref: Class | Class section |
| `status` | String | - | `active` | enum: `active`, `completed`, `withdrawn` | Enrollment status |
| `progress` | Number | - | 0 | min: 0, max: 100 | Completion percentage |
| `startedAt` | Date | - | - | - | When started |
| `completedAt` | Date | - | - | - | When completed |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### ClassEnrollment

**Collection**: `classenrollments`  
**File**: `model/Academic/ClassEnrollment.ts`  
**Purpose**: Learner enrollment in class sections

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `learner` | ObjectId | ✅ | - | ref: Learner | Enrolled learner |
| `class` | ObjectId | ✅ | - | ref: Class | Target class |
| `program` | ObjectId | ✅ | - | ref: Program | Parent program |
| `programLevel` | ObjectId | ✅ | - | ref: ProgramLevel | Parent level |
| `enrolledAt` | Date | ✅ | Date.now | - | Enrollment date |
| `completedAt` | Date | - | - | - | Completion date |
| `withdrawnAt` | Date | - | - | - | Withdrawal date |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

## Progress & Assessment Models

### LearnerProgress (DEPRECATED)

**Collection**: `learnerprogresses`  
**File**: `model/Content/LearnerProgress.ts`  
**Purpose**: Track learner progress on content segments

> **⚠️ DEPRECATED (DCV-052)**: This model is deprecated as of Phase 15. New code should use:
> - **CourseEnrollmentCurrent**: For active/in-progress course tracking
> - **CourseEnrollmentActivity**: For completed/withdrawn course history
>
> This model is retained for backward compatibility with existing data.
> Use `scripts/migrate-enrollment-system.ts` to migrate legacy data.

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `learnerId` | ObjectId | ✅ | - | - | Learner (no ref declared) |
| `courseId` | ObjectId | - | - | ref: Course | Course reference |
| `contentId` | ObjectId | ✅ | - | - | Content segment (no ref) |
| `segmentId` | String | ✅ | - | - | Segment identifier |
| `contentType` | String | ✅ | - | enum: `scorm`, `custom` | Content type |
| `customType` | String | - | - | enum: `exam`, `quiz`, `exercise`, `scorm`, `custom` | Custom subtype |
| `status` | String | ✅ | `not_started` | enum: `not_started`, `in_progress`, `completed`, `failed` | Progress status |
| `progressPercent` | Number | - | 0 | min: 0, max: 100 | Completion % |
| `score` | Number | - | 0 | min: 0 | Points earned |
| `maxScore` | Number | - | 100 | min: 0 | Points possible |
| `passed` | Boolean | - | - | - | Pass/fail status |
| `attemptCount` | Number | - | 0 | - | Number of attempts |
| `timeSpentSec` | Number | - | 0 | - | Time spent (seconds) |
| `lastActivityAt` | Date | - | - | - | Last activity time |
| `payload` | Mixed | - | - | - | Additional data |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**: `learnerId`, `courseId`, `contentId`, `(learnerId, courseId, contentId)`

---

### ContentAttempt

**Collection**: `contentattempts`  
**File**: `model/Academic/ContentAttempt.ts`  
**Purpose**: Individual content attempt records

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `learner` | ObjectId | ✅ | - | ref: Learner | Attempting learner |
| `courseContent` | ObjectId | ✅ | - | ref: CourseContent | Content segment |
| `contentType` | String | ✅ | - | enum: `scorm`, `custom` | Content type |
| `status` | String | - | `in_progress` | enum: `in_progress`, `completed`, `abandoned` | Attempt status |
| `scormAttemptId` | ObjectId | - | - | ref: ScormAttempt | SCORM link |
| `score` | Number | - | - | min: 0, max: 100 | Score achieved |
| `maxScore` | Number | - | - | min: 0 | Maximum possible |
| `passed` | Boolean | - | - | - | Pass/fail |
| `timeSpentSec` | Number | - | 0 | - | Time spent |
| `payload` | Mixed | - | - | - | Additional data |
| `customType` | String | - | - | enum: `exam`, `quiz`, `exercise`, `scorm`, `custom` | Custom subtype |
| `startedAt` | Date | ✅ | Date.now | - | Attempt start |
| `completedAt` | Date | - | - | - | Attempt end |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**: `learner`, `courseContent`, `(learner, courseContent, startedAt)`, `(courseContent, status)`, `scormAttemptId (unique, sparse)`

---

### Exam

**Collection**: `exams`  
**File**: `model/Academic/Exam.ts`  
**Purpose**: Formal exam definitions

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `name` | String | ✅ | - | - | Exam name |
| `description` | String | ✅ | - | - | Exam description |
| `course` | ObjectId | ✅ | - | ref: Course | Associated course |
| `program` | ObjectId | ✅ | - | ref: Program | Associated program |
| `passMark` | Number | ✅ | 30 | - | Passing score |
| `totalMark` | Number | ✅ | 100 | - | Maximum score |
| `academicTerm` | ObjectId | ✅ | - | ref: AcademicTerm | Term offered |
| `duration` | String | ✅ | `30 minutes` | - | Time limit |
| `examDate` | Date | ✅ | new Date() | - | Exam date |
| `examTime` | String | ✅ | - | - | Exam time |
| `examType` | String | ✅ | `quiz` | - | Type of exam |
| `examStatus` | String | ✅ | `pending` | enum: `pending`, `live` | Exam status |
| `questions` | [ObjectId] | - | - | ref: Question | Exam questions |
| `programLevel` | ObjectId | - | - | ref: ProgramLevel | Program level |
| `createdBy` | ObjectId | ✅ | - | ref: Staff | Creator |
| `academicYear` | ObjectId | ✅ | - | ref: AcademicYear | Academic year |
| `gradingPolicy` | Object | - | `{ type: 'final-attempt' }` | - | How to calculate final grade (DCV-033) |
| `gradingPolicy.type` | String | - | `final-attempt` | enum: `final-attempt`, `best-attempt`, `average-all`, `average-last-n` | Grading strategy |
| `gradingPolicy.averageCount` | Number | - | - | - | Number of attempts for `average-last-n` |
| `maxAttempts` | Number | - | null | - | Maximum retakes (null = unlimited) |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### ExamResult

**Collection**: `examresults`  
**File**: `model/Academic/ExamResults.ts`  
**Purpose**: Learner exam results

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `learner` | ObjectId | ✅ | - | ref: Learner | Test taker |
| `exam` | ObjectId | ✅ | - | ref: Exam | Exam taken |
| `grade` | Number | ✅ | - | - | Final grade |
| `score` | Number | ✅ | - | - | Points earned |
| `passMark` | Number | ✅ | 30 | - | Required to pass |
| `answeredQuestions` | [Object] | - | - | - | Responses |
| `status` | String | ✅ | `failed` | enum: `failed`, `passed` | Result status |
| `remarks` | String | ✅ | `Fair` | enum: `Excellent!`, `Very Good`, `Good`, `Fair`, `Needs Improvement` | Performance remark |
| `programLevel` | ObjectId | - | - | ref: ProgramLevel | Program level |
| `academicTerm` | ObjectId | ✅ | - | ref: AcademicTerm | Term |
| `academicYear` | ObjectId | ✅ | - | ref: AcademicYear | Year |
| `isPublished` | Boolean | - | false | - | Results visible |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### Question

**Collection**: `questions`  
**File**: `model/Academic/Questions.ts`  
**Purpose**: Exam questions

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `question` | String | ✅ | - | - | Question text |
| `optionA` | String | ✅ | - | - | Option A |
| `optionB` | String | ✅ | - | - | Option B |
| `optionC` | String | ✅ | - | - | Option C |
| `optionD` | String | ✅ | - | - | Option D |
| `correctAnswer` | String | ✅ | - | enum: `A`, `B`, `C`, `D` | Correct option |
| `isCorrect` | Boolean | - | false | - | ??? Unclear purpose |
| `createdBy` | ObjectId | ✅ | - | ref: Staff | Creator |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

## SCORM Models

### ScormPackage

**Collection**: `scormpackages`  
**File**: `model/Scorm/ScormPackage.ts`  
**Purpose**: SCORM content package metadata

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `packageId` | String | ✅ | - | Unique | Package identifier |
| `title` | String | ✅ | - | - | Package title |
| `description` | String | - | - | - | Package description |
| `version` | String | ✅ | - | enum: `scorm_1.2`, `scorm_2004` | SCORM version |
| `fileName` | String | ✅ | - | - | Original filename |
| `fileSize` | Number | ✅ | - | - | File size (bytes) |
| `uploadedAt` | Date | ✅ | Date.now | - | Upload time |
| `filePath` | String | ✅ | - | - | Storage path |
| `manifestData` | Object | - | - | - | imsmanifest.xml data |
| `launchUrl` | String | ✅ | - | - | Entry URL |
| `entryPoint` | String | ✅ | - | - | Entry point |
| `course` | ObjectId | - | - | ref: Course | Linked course |
| `program` | ObjectId | - | - | ref: Program | Linked program |
| `programLevel` | ObjectId | - | - | ref: ProgramLevel | Linked level |
| `department` | ObjectId | - | - | ref: Department | Owning dept |
| `academicTerm` | ObjectId | - | - | ref: AcademicTerm | Term |
| `isGraded` | Boolean | ✅ | true | - | Grade tracking |
| `passingScore` | Number | - | - | min: 0, max: 100 | Pass threshold |
| `maxScore` | Number | ✅ | 100 | - | Maximum score |
| `weight` | Number | - | - | min: 0, max: 100 | Grade weight |
| `dueDate` | Date | - | - | - | Due date |
| `gradingPolicy` | Object | - | `{ type: 'final-attempt' }` | - | How to calculate final grade (DCV-034) |
| `gradingPolicy.type` | String | - | `final-attempt` | enum: `final-attempt`, `best-attempt`, `average-all`, `average-last-n` | Grading strategy |
| `gradingPolicy.averageCount` | Number | - | - | - | Number of attempts for `average-last-n` |
| `maxAttempts` | Number | - | null | - | Maximum retakes (null = unlimited) |
| `createdBy` | ObjectId | ✅ | - | - | Creator |
| `uploadedBy` | ObjectId | - | - | refPath: uploadedByModel | Uploader |
| `uploadedByModel` | String | - | `Staff` | enum: `Admin`, `Staff`, `Instructor`, `Learner` | Uploader type |
| `assignedTo.learners` | [ObjectId] | - | - | ref: Learner | Assigned learners |
| `assignedTo.classes` | [ObjectId] | - | - | ref: Class | Assigned classes |
| `assignedTo.programs` | [ObjectId] | - | - | ref: Program | Assigned programs |
| `status` | String | ✅ | `draft` | enum: `draft`, `published`, `archived` | Package status |
| `isGlobal` | Boolean | - | false | - | Available globally |
| `isPublished` | Boolean | ✅ | false | - | Published flag |
| `publishedAt` | Date | - | - | - | Publish time |
| `publishedBy` | ObjectId | - | - | refPath: publishedByModel | Publisher |
| `publishedByModel` | String | - | `Staff` | enum: `Admin`, `Staff`, `Instructor` | Publisher type |
| `unpublishedAt` | Date | - | - | - | Unpublish time |
| `unpublishedBy` | ObjectId | - | - | refPath: unpublishedByModel | Unpublisher |
| `unpublishedByModel` | String | - | `Staff` | enum: `Admin`, `Staff`, `Instructor` | Type |
| `isActive` | Boolean | ✅ | true | - | Active flag |
| `trackingOptions` | Object | - | - | - | Tracking settings |
| `stats` | Object | - | - | - | Usage statistics |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### ScormAttempt

**Collection**: `scormattempts`  
**File**: `model/Scorm/ScormAttempt.ts`  
**Purpose**: SCORM package attempt records (CMI data)

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `attemptId` | String | ✅ | - | Unique | Attempt identifier |
| `learner` | ObjectId | ✅ | - | ref: Learner | Attempting learner |
| `package` | ObjectId | ✅ | - | ref: ScormPackage | SCORM package |
| `attemptNumber` | Number | ✅ | - | min: 1 | Attempt number |
| `startedAt` | Date | ✅ | Date.now | - | Start time |
| `lastAccessedAt` | Date | ✅ | Date.now | - | Last access |
| `completedAt` | Date | - | - | - | Completion time |
| `status` | String | ✅ | `not_started` | enum | Attempt status |
| `cmi.*` | Various | - | - | - | SCORM CMI data model |
| `rawCmiData` | Mixed | - | {} | - | Raw CMI storage |
| `interactionLog` | [Object] | - | - | - | API call log |
| `timeSpentSeconds` | Number | - | 0 | - | Total time |
| `scorePercentage` | Number | - | - | min: 0, max: 100 | Score % |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

## System Models

### Settings

**Collection**: `settings`  
**File**: `model/System/Settings.ts`  
**Purpose**: System-wide configuration

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `scope` | String | ✅ | `global` | enum: `global`, unique | Settings scope |
| `pagination.defaultLimit` | Number | - | 10 | - | Default page size |
| `pagination.maxLimit` | Number | - | 100 | - | Maximum page size |
| `pagination.overrides` | Map | - | - | - | Per-entity overrides |
| `features` | Map<String, Boolean> | - | - | - | Feature flags (DCV-050) |
| `updatedBy` | ObjectId | - | - | ref: Admin | Last editor |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

---

### Lookup

**Collection**: `lookups`  
**File**: `model/System/Lookup.ts`  
**Purpose**: Generic key-value lookup data

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `type` | String | ✅ | - | indexed | Lookup category |
| `value` | String | ✅ | - | - | Lookup value |
| `createdAt` | Date | Auto | - | - | Record creation |
| `updatedAt` | Date | Auto | - | - | Last modification |

**Indexes**: `type`, `(type, value) unique`

---

### Audit

**Collection**: `audits`  
**File**: `model/Audit.ts`  
**Purpose**: System audit trail

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `_id` | ObjectId | Auto | - | - | Primary key |
| `action` | String | ✅ | - | indexed | Action performed |
| `entityType` | String | ✅ | - | indexed | Entity type |
| `entityId` | ObjectId | ✅ | - | indexed | Entity ID |
| `actorId` | ObjectId | ✅ | - | indexed | Who performed |
| `actorRole` | String | ✅ | - | - | Actor's role |
| `reason` | String | - | - | - | Reason for action |
| `before` | Mixed | - | - | - | State before |
| `after` | Mixed | - | - | - | State after |
| `context` | Mixed | - | - | - | Additional context |
| `createdAt` | Date | Auto | - | - | Action time |

---

## Appendix: Address Subdocument

Used in: Admin, Staff, Learner

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `line1` | String | ✅ | - | Street address 1 |
| `line2` | String | - | - | Street address 2 |
| `city` | String | ✅ | - | City |
| `region` | String | - | - | State/Province |
| `postalCode` | String | ✅ | - | ZIP/Postal code |
| `country` | String | ✅ | - | Country |
| `isPrimaryCorrespondence` | Boolean | - | false | Primary mailing |
| `isPrimaryBilling` | Boolean | - | false | Primary billing |

---

## Appendix: Honor Subdocument

Used in: Admin, Staff, Learner

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sex` | String | - | - | Biological sex |
| `gender` | String | - | - | Gender identity |
| `pronouns` | String | - | - | Preferred pronouns |
| `honorific` | String | - | - | Title (Dr., Mr., etc.) |
