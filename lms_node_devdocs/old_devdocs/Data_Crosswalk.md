# LMS Data Crosswalk & Schema Analysis

> **Generated**: January 5, 2026  
> **Purpose**: Comprehensive schema analysis identifying inconsistencies, expected fields, and remediation recommendations

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Key Definitions](#key-definitions)
3. [Schema Inventory](#schema-inventory)
4. [Identity & Authentication](#identity--authentication)
5. [Academic Structure](#academic-structure)
6. [Content & Delivery](#content--delivery)
7. [Progress & Analytics](#progress--analytics)
8. [System & Configuration](#system--configuration)
9. [Cross-Cutting Concerns](#cross-cutting-concerns)
10. [Remediation Priority Matrix](#remediation-priority-matrix)

---

## Executive Summary

### Collections Count: 28 Total

| Category | Count | Models |
|----------|-------|--------|
| Academic | 16 | AcademicTerm, AcademicYear, Class, ClassEnrollment, ContentAttempt, CourseContent, CourseEnrollment, Department, Exam, ExamResult, Learner, Program, ProgramEnrollment, ProgramLevel, Question, YearGroup |
| Auth | 3 | User, RefreshToken, TokenBlacklist |
| Staff | 3 | Admin, Staff, StaffRole |
| Content | 6 | Course, CustomContent, DepartmentMasterCSS, LearnerProgress, MasterTemplate, RenderedCourse |
| Scorm | 2 | ScormAttempt, ScormPackage |
| System | 3 | Lookup, Settings, Audit |

### Key Issues Identified

| Issue Type | Count | Severity |
|------------|-------|----------|
| Duplicate/Overlapping Models | 4 | 🔴 High |
| Inconsistent Field Naming | 12 | 🟡 Medium |
| Missing References | 6 | 🟡 Medium |
| Orphaned Fields | 8 | 🟢 Low |
| Type Mismatches | 3 | 🔴 High |

---

## Key Definitions

> **Important**: These definitions clarify the business meaning of key entities in the LMS.

### Class

> A **Class** is a group of students (learners) attending a program (or multiple programs) at the same time.

**Key Characteristics**:
- Represents a cohort of learners progressing through a program together
- Has a defined start and end date
- Associated with a specific AcademicYear and AcademicTerm
- Can have assigned instructors
- Learners are enrolled in Classes via ClassEnrollment

**Relationship to Calendar**:
- Classes exist within the context of AcademicYear → AcademicTerm
- Staff should NOT have academicYear stored directly; context comes from Class assignments
- AcademicYear is the source of truth for time boundaries

### Person Types

| Type | Collection | Role | Scope |
|------|------------|------|-------|
| **Global Admin** | `admins` | Full system access | All departments, all programs |
| **Staff** | `staffs` | Instructors, dept admins | Scoped via `departmentMemberships` |
| **Learner** | `learners` | Students | Enrolled via ProgramEnrollment, ClassEnrollment |

All person types share `_id` with their corresponding `User` record for authentication linking.

---

## Schema Inventory

### Identity & Authentication

#### **User** (model/Auth/User.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `email` | String (*req) | Login identifier | ✅ Good | - | |
| `username` | String | Alternative login | ⚠️ Sparse | Consider removing or making required | **KEEP**: Optional as-is |
| `passwordHash` | String (*req) | Auth | ✅ Good | - | |
| `role` | enum ['global-admin', 'staff', 'learner'] | Role type | ✅ Good | - | **UPDATE**: Changing to `roles` array to support multi-role persons. See DCV-001 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |
| `subroles` | [String] | Staff sub-roles | ⚠️ No validation | Add enum validation for known subroles | **UPDATE**: Renaming to `staffRoles`. See DCV-001 |
| `status` | enum ['active', 'inactive', 'archived', 'deleted'] | Account state | ✅ Good | - | |
| `emailVerified` | Boolean | Email confirmation | ✅ Good | - | |
| `emailVerifiedAt` | Date | Verification timestamp | ✅ Good | - | |
| `lastLoginAt` | Date | Tracking | ✅ Good | - | |
| `passwordUpdatedAt` | Date | Security tracking | ✅ Good | - | |
| - | - | **Missing: `personId`** | 🔴 No link to Staff/Learner/Admin | Add `personId: ObjectId` + `personModel: enum` | **RESOLVED**: Using shared `_id` pattern instead. User._id = Staff._id = Learner._id = Admin._id for same person. No additional field needed. See [DCV Implementation Plan](Data_Consolidation_Validation_Implementation.md) |

**Recommended Changes:**
1. Add `personId` + `personModel` to link User to Staff/Learner/Admin
2. Add subrole enum validation
3. Consider deprecating `username` if not used

---

#### **Admin** (model/Staff/Admin.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `name` | Object (first/middle/last/display) | Identity | ✅ Good | - | |
| `email` | String (*req) | Contact | ⚠️ Duplicate of User.email | Consider removing - use User ref | **REMOVE**: Derive from User via shared `_id`. See DCV-039 |
| `department` | ObjectId ref:Department | Admin's dept | ⚠️ Single dept only | Consider departmentMemberships like Staff | **KEEP**: Admins are global (MasterDepartment only). Single dept is fine. |
| `addresses` | [Address] | Contact info | ✅ Good | - | |
| `honor` | Object | Demographics | ✅ Good | - | |
| `academicTerms` | [ObjectId] | Created terms | ⚠️ Orphaned | Remove | **REMOVE**: Not needed. Dashboard uses aggregate queries. |
| `programs` | [ObjectId] | Created programs | ⚠️ Orphaned | Remove | **REMOVE**: Use `Program.countDocuments()` for dashboard. See DCV-016 |
| `yearGroups` | [ObjectId] | Created groups | ⚠️ Orphaned | Remove | **REMOVE**: Not needed. Dashboard uses aggregate queries. |
| `academicYears` | [ObjectId] | Created years | ⚠️ Orphaned | Remove | **REMOVE**: Not needed. Dashboard uses aggregate queries. |
| `programLevels` | [ObjectId] | Created levels | ⚠️ Orphaned | Remove | **REMOVE**: Drill-down via `ProgramLevel.find({ program })` |
| `courses` | [ObjectId] | Created courses | ⚠️ Orphaned | Remove | **REMOVE**: Use `Course.countDocuments()` for dashboard. |
| `instructors` | [ObjectId] | Created staff | ⚠️ Orphaned | Remove | **REMOVE**: Query via `Course.find().populate('instructors')` |
| `learners` | [ObjectId] | Created learners | ⚠️ Orphaned | Remove | **REMOVE**: Use `Learner.countDocuments()` for dashboard. |
| - | - | **Missing: `userId`** | 🔴 No link to User | Add `userId: ObjectId ref:User` | **RESOLVED**: Using shared `_id` pattern. Admin._id === User._id. Pre-save validation ensures User exists. See DCV-003 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |

**Recommended Changes:**
1. Remove ALL "created entity" arrays - dashboard metrics come from aggregate queries, not stored arrays
2. No need to track "who created what" at fine-grained level
3. Consider merging Admin into Staff with elevated role

**Dashboard Metrics Approach:**
- Total counts: `Collection.countDocuments({ department: deptId })`
- Drill-downs: Query child collections with parent reference
- No per-admin tracking needed

---

#### **Staff** (model/Staff/Staff.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `name` | Object (first/middle/last/display) | Identity | ✅ Good | - | |
| `email` | String (*req) | Contact | ⚠️ Duplicate of User.email | Consider using User ref | **DEPRECATE**: Remove field, derive from User collection via shared `_id`. See DCV-021 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |
| `dateEmployed` | Date | HR tracking | ✅ Good | - | |
| `instructorId` | String (*req, auto) | Display ID | ✅ Good | - | |
| `isWithdrawn` | Boolean | Status | ⚠️ Redundant | Use single `status` enum | **REPLACE**: Use `status: enum ['active', 'suspended', 'withdrawn']`. See DCV-040 |
| `isSuspended` | Boolean | Status | ⚠️ Redundant | Use single `status` enum | **REPLACE**: Use `status: enum ['active', 'suspended', 'withdrawn']`. See DCV-040 |
| `departmentMemberships` | [Membership] | Multi-dept | ✅ Good | - | **PRIMARY**: This is the source of truth for department assignments |
| `addresses` | [Address] | Contact | ✅ Good | - | |
| `honor` | Object | Demographics | ✅ Good | - | |
| `course` | ObjectId ref:Course | ??? | 🔴 Unclear purpose | Remove or document purpose | **REMOVE**: Legacy field. Instructor course assignments come from `Course.primaryInstructors/secondaryInstructors`. See DCV-036 |
| `applicationStatus` | enum | Onboarding | ✅ Good | - | |
| `program` | ObjectId ref:Program | ??? | 🔴 Unclear - conflicts with memberships | Remove - use memberships | **REMOVE**: Legacy field. Use departmentMemberships for assignments. See DCV-036 |
| `programLevel` | ObjectId ref:ProgramLevel | ??? | 🔴 Unclear purpose | Remove - instructors teach via Course | **REMOVE**: Legacy field. Instructors teach via Course, not ProgramLevel. See DCV-036 |
| `department` | ObjectId ref:Department | Primary dept | ⚠️ Redundant with memberships | Remove - use memberships[0] | **DEPRECATE**: Remove field, use `departmentMemberships` as source of truth. See DCV-022 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |
| `academicYear` | ObjectId ref:AcademicYear | Current year | ⚠️ Should be per-membership | Remove or restructure | **DEPRECATE**: Remove field. Academic year context should come from Calendar/Class collections, not stored on Staff. See DCV-023 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |
| `examsCreated` | [ObjectId] | Created exams | ⚠️ Orphaned | Remove - query via createdBy | **REMOVE**: Not needed. See DCV-036 |
| `createdBy` | ObjectId ref:Admin | Creator | ✅ Good | - | |
| - | - | **Missing: `userId`** | 🔴 No link to User | Add `userId: ObjectId ref:User` | **RESOLVED**: Using shared `_id` pattern. Staff._id === User._id. Pre-save validation ensures User exists. See DCV-004 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |

**Recommended Changes:**
1. ~~Add `userId` reference~~ → Resolved via shared _id pattern
2. Replace `isWithdrawn` + `isSuspended` with `status: enum ['active', 'suspended', 'withdrawn']`
3. Remove orphaned fields: `course`, `program`, `programLevel`, `examsCreated`
4. **DEPRECATE `email`** → Derive from User via shared `_id` (DCV-021)
5. **DEPRECATE `department`** → Use `departmentMemberships` as source of truth (DCV-022)
6. **DEPRECATE `academicYear`** → Context comes from Calendar/Class, not Staff (DCV-023)

---

#### **Learner** (model/Academic/Learner.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `name` | Object (first/middle/last/display) | Identity | ✅ Good | - | |
| `email` | String (*req, unique) | Contact/Login | ⚠️ Duplicate of User.email | Consider using User ref | **REMOVE**: Derive from User via shared `_id`. See DCV-041 |
| `learnerId` | String (*req, unique, auto) | Display ID | ✅ Good | - | |
| `addresses` | [Address] | Contact | ✅ Good | - | |
| `honor` | Object | Demographics | ✅ Good | - | |
| `globalStatus` | enum ['active', 'inactive'] | Account state | ✅ Good | - | |
| `programEnrolmentStatuses` | [embedded] | Per-program status | ⚠️ Duplicates ProgramEnrollment | Consider single source of truth | **REMOVE**: Use ProgramEnrollment as source of truth. See DCV-029 |
| - | - | **Missing: `userId`** | 🔴 No link to User | Add `userId: ObjectId ref:User` | **RESOLVED**: Using shared `_id` pattern. Learner._id === User._id. Pre-save validation ensures User exists. See DCV-005 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |

**Recommended Changes:**
1. ~~Add `userId` reference~~ → Resolved via shared _id pattern
2. Remove `programEnrolmentStatuses` - use ProgramEnrollment as source of truth
3. Standardize spelling: `Enrolment` → `Enrollment`

---

### Academic Structure

#### **Department** (model/Academic/Department.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `name` | String (*req) | Display name | ✅ Good | - | |
| `code` | String (unique, sparse) | Short code | ✅ Good | - | |
| `level` | enum ['master', 'top', 'sub'] | Hierarchy | ✅ Good | - | |
| `parent` | ObjectId ref:Department | Hierarchy | ✅ Good | - | |
| `ancestors` | [ObjectId] | Hierarchy path | ✅ Good | - | |
| `passingStyleScore` | Number 0-100 | Default pass % | ✅ Good | - | |
| - | - | **Missing: `isActive`** | ⚠️ No soft delete | Add `isActive: Boolean` or `status` | **ADD**: `status: enum ['active', 'archived']`. See DCV-042 |

**Recommended Changes:**
1. Add `isActive` or `status` field for soft deletes

---

#### **Program** (model/Academic/Program.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `name` | String (*req) | Display name | ✅ Good | - | |
| `description` | String (*req) | Details | ✅ Good | - | |
| `duration` | String (*req) | Length | ⚠️ String not structured | Consider `durationMonths: Number` | **REMOVE**: Duration tracked at Class level, not Program. See DCV-043 |
| `code` | String (auto) | Short code | ✅ Good | - | |
| `createdBy` | ObjectId ref:Admin | Creator | ✅ Good | - | |
| `department` | ObjectId (*req) ref:Department | Owner | ✅ Good | - | |
| `instructors` | [ObjectId] ref:Staff | Program staff | ⚠️ Redundant | Remove - derive from Course.primaryInstructors | **DEPRECATE**: Remove field. Derive via Course → primaryInstructors/secondaryInstructors. Use cached query service. See DCV-014 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |
| `learners` | [ObjectId] ref:Learner | Enrolled | 🔴 Sync issue | Remove - use ProgramEnrollment | **DEPRECATE**: Remove field. Query ProgramEnrollment for active learners. Use cached query service. See DCV-013 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |
| `courses` | [ObjectId] ref:Course | Program courses | 🔴 Sync issue | Remove - derive from ProgramLevel.courses | **DEPRECATE**: Remove field. Derive via ProgramLevel → courses. Use cached query service. See DCV-015 in [Implementation Plan](Data_Consolidation_Validation_Implementation.md) |
| `archived` | Boolean | Soft delete | ✅ Good | - | |
| `archivedAt` | Date | Archive time | ✅ Good | - | |

**Recommended Changes:**
1. ~~Remove `learners` array~~ → See DCV-013
2. ~~Remove `courses` array~~ → See DCV-015
3. ~~Remove `instructors` array~~ → See DCV-014
4. Change `duration` to `durationMonths: Number`
5. Use ProgramQueryService (DCV-017) for cached derived queries

---

#### **ProgramLevel** (model/Academic/ProgramLevel.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `program` | ObjectId (*req) ref:Program | Parent | ✅ Good | - | |
| `courses` | [ObjectId] ref:Course | Level courses | ⚠️ Bi-directional sync | Consider Course.programLevel as source | |
| `name` | String (*req) | Display name | ✅ Good | - | |
| `description` | String | Details | ✅ Good | - | |
| `order` | Number (*req, min:1) | Sequence | ✅ Good | - | |
| `department` | ObjectId ref:Department | Level dept | ⚠️ Should inherit from Program | Remove - inherit from program.department | |
| `archived` | Boolean | Soft delete | ✅ Good | - | |
| `archivedAt` | Date | Archive time | ✅ Good | - | |
| `createdBy` | ObjectId (*req) ref:Admin | Creator | ✅ Good | - | |

**Recommended Changes:**
1. Remove `department` - inherit from Program
2. Consider removing `courses` array - use Course.programLevel as source

---

#### **Course** (model/Content/Course.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `title` | String (*req) | Display name | ✅ Good | - | |
| `shortDescription` | String | Summary | ✅ Good | - | |
| `longDescription` | String | Full desc | ✅ Good | - | |
| `description` | String | ??? | 🔴 Redundant | Remove - use short/long | **REMOVE**: Redundant with shortDescription/longDescription. See DCV-037 |
| `program` | ObjectId (*req) ref:Program | Parent | ✅ Good | - | |
| `programLevel` | ObjectId ref:ProgramLevel | Level | ✅ Good | - | |
| `department` | ObjectId ref:Department | Course dept | ⚠️ Should inherit | Remove - inherit from program | **REMOVE**: Inherit from `programLevel.program.department`. See DCV-044 |
| `isArchived` | Boolean | Soft delete | ✅ Good | - | |
| `status` | enum ['draft', 'rendered', 'published'] | Workflow | ✅ Good | - | |
| `publishedAt` | Date | Publish time | ✅ Good | - | |
| `publishedBy` | ObjectId ref:Staff | Publisher | ✅ Good | - | |
| `primaryInstructors` | [ObjectId] ref:Staff | Main instructors | ✅ Good | - | |
| `secondaryInstructors` | [ObjectId] ref:Staff | Assistants | ✅ Good | - | |
| `archivedAt` | Date | Archive time | ✅ Good | - | |
| `createdBy` | ObjectId (*req) ref:Admin | Creator | ✅ Good | - | |
| - | - | **Missing: `estimatedDuration`** | ⚠️ No course length | Add `estimatedMinutes: Number` | **NOT NEEDED**: Duration not tracked at course level. |

**Recommended Changes:**
1. Remove `description` - use shortDescription/longDescription
2. Remove `department` - inherit from program.department
3. Add `estimatedMinutes: Number` for course duration

---

### Content & Delivery

#### **CourseContent** (model/Academic/CourseContent.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `course` | ObjectId (*req) ref:Course | Parent | ✅ Good | - | |
| `shortDescription` | String | Summary | ✅ Good | - | |
| `longDescription` | String | Full desc | ✅ Good | - | |
| `contentType` | enum ['scorm', 'custom'] | Type | ✅ Good | - | |
| `scormPackageId` | ObjectId ref:ScormPackage | SCORM ref | ✅ Good | - | |
| `customContentId` | ObjectId ref:CustomContent | Custom ref | ✅ Good | - | |
| `order` | Number (*req, min:1) | Sequence | ✅ Good | - | |
| `isRequired` | Boolean | Mandatory | ✅ Good | - | |
| `createdBy` | ObjectId (*req) ref:Admin | Creator | ✅ Good | - | |
| - | - | **Missing: `title`** | ⚠️ No segment title | Add `title: String` | **ADD**: Add `title: String` to segments. See DCV-045 |

**Recommended Changes:**
1. Add `title: String` for segment display name

---

#### **CustomContent** (model/Content/CustomContent.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `title` | String (*req) | Display name | ✅ Good | - | |
| `customType` | enum ['exam', 'quiz', 'exercise', 'scorm', 'custom'] | Content type | ⚠️ 'scorm' shouldn't be here | Remove 'scorm' from enum | **UPDATE**: Remove 'scorm' from enum. See DCV-046 |
| `payload` | Mixed | Type-specific data | ✅ Good | - | |
| `html` | String | Rendered content | ✅ Good | - | |
| `css` | String | Styling | ✅ Good | - | |
| `department` | ObjectId ref:Department | Owner | ✅ Good | - | |
| `createdBy` | ObjectId (*req) ref:Admin | Creator | ✅ Good | - | |
| - | - | **Missing: `questions`** | ⚠️ Quiz/exam questions | Consider embedded or ref to Questions | **ADD**: `questions: [ObjectId] ref:Question` for quiz/exam types. See DCV-047 |

**Recommended Changes:**
1. Remove 'scorm' from customType enum
2. Add `questions: [ObjectId] ref:Question` for quiz/exam types

---

#### **RenderedCourse** (model/Content/RenderedCourse.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `courseId` | ObjectId (*req) ref:Course | Source course | ✅ Good | - | |
| `contentVersion` | Date (*req) | Version timestamp | ✅ Good | - | |
| `html` | String (*req) | Rendered output | ✅ Good | - | |
| - | - | **Missing: `css`** | ⚠️ No styling | Add `css: String` | **ADD**: See DCV-048 |
| - | - | **Missing: `version`** | ⚠️ No version number | Add `version: Number` | **ADD**: See DCV-048 |

**Recommended Changes:**
1. Add `css: String` for course-specific styling
2. Add `version: Number` for version tracking
3. Consider adding `renderedBy: ObjectId ref:Staff`

---

### Progress & Analytics

#### **LearnerProgress** (model/Content/LearnerProgress.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `learnerId` | ObjectId (*req) | Learner ref | ⚠️ No ref declaration | Add `ref: 'Learner'` | **FIX**: Add proper ref declaration. See DCV-049 |
| `courseId` | ObjectId ref:Course | Course ref | ✅ Good | - | |
| `contentId` | ObjectId (*req) | Content ref | ⚠️ No ref declaration | Add `ref: 'CourseContent'` | **FIX**: Add proper ref declaration. See DCV-049 |
| `segmentId` | String (*req) | Segment ID | ⚠️ String not ObjectId | Consider ObjectId or remove | |
| `contentType` | enum ['scorm', 'custom'] | Type | ✅ Good | - | |
| `customType` | enum | Subtype | ✅ Good | - | |
| `status` | enum ['not_started', 'in_progress', 'completed', 'failed'] | Progress state | ✅ Good | - | |
| `progressPercent` | Number 0-100 | Completion % | ✅ Good | - | |
| `score` | Number | Points earned | ✅ Good | - | |
| `maxScore` | Number | Points possible | ✅ Good | - | |
| `passed` | Boolean | Pass/fail | ✅ Good | - | |
| `attemptCount` | Number | Attempts | ✅ Good | - | |
| `timeSpentSec` | Number | Time tracking | ✅ Good | - | |
| `lastActivityAt` | Date | Activity time | ✅ Good | - | |
| `payload` | Mixed | Extra data | ✅ Good | - | |

**Recommended Changes:**
1. Add proper refs: `learnerId ref:Learner`, `contentId ref:CourseContent`
2. Clarify `segmentId` purpose or remove

---

#### **ContentAttempt** (model/Academic/ContentAttempt.ts)

| Field | Current Type | Expected Use | Issue | Remedy |
|-------|-------------|--------------|-------|--------|
| `learner` | ObjectId (*req) ref:Learner | Learner | ✅ Good | - |
| `courseContent` | ObjectId (*req) ref:CourseContent | Content | ✅ Good | - |
| `contentType` | enum ['scorm', 'custom'] | Type | ✅ Good | - |
| `status` | enum ['in_progress', 'completed', 'abandoned'] | State | ✅ Good | - |
| `scormAttemptId` | ObjectId ref:ScormAttempt | SCORM link | ✅ Good | - |
| `score` | Number 0-100 | Score | ✅ Good | - |
| `maxScore` | Number | Max possible | ✅ Good | - |
| `passed` | Boolean | Pass/fail | ✅ Good | - |
| `timeSpentSec` | Number | Duration | ✅ Good | - |
| `payload` | Mixed | Extra data | ✅ Good | - |
| `customType` | enum | Subtype | ✅ Good | - |
| `startedAt` | Date (*req) | Start time | ✅ Good | - |
| `completedAt` | Date | End time | ✅ Good | - |

**Analysis:** This model is well-structured. ✅

---

#### **Duplicate Analysis: LearnerProgress vs ContentAttempt**

| Aspect | LearnerProgress | ContentAttempt |
|--------|-----------------|----------------|
| Purpose | Aggregate progress | Individual attempts |
| Scope | Per learner+content | Per attempt |
| Overlap | score, passed, timeSpentSec, status | Same fields |

**Recommendation:** These serve different purposes but have field overlap. Consider:
1. LearnerProgress = aggregate/summary view
2. ContentAttempt = individual attempt detail
3. Add `learnerProgress: ObjectId ref:LearnerProgress` to ContentAttempt

---

### Enrollment Models Analysis

#### **Duplicate Analysis: Enrollment Models**

| Model | Purpose | Key Fields | Issue | Resolution Comments |
|-------|---------|------------|-------|---------------------|
| ProgramEnrollment | Program-level enrollment | learner, program, status | ✅ Primary | **KEEP**: Add credentialGoal, statusHistory. See DCV-026 |
| CourseEnrollment | Course-level enrollment | learner, course, progress | 🔄 Redesign | **REPLACE** with Current/Activity pattern. See DCV-027, DCV-028 |
| ClassEnrollment | Class-level enrollment | learner, class | ⚠️ Evaluate | Keep for cohort tracking if Classes remain |
| Learner.programEnrolmentStatuses | Embedded status | programId, status | 🔴 Duplicate | **REMOVE**: See DCV-029 |

#### **Finalized Enrollment Design**

> See [Data_Consolidation_Validation_Implementation.md](Data_Consolidation_Validation_Implementation.md) for full schemas.

| Model | Purpose | Lifecycle |
|-------|---------|----------|
| **ProgramEnrollment** | Program membership + credential tracking | Long-lived, one per learner-program |
| **CourseEnrollmentCurrent** | Active course enrollments with attempt tracking | Transient - deleted on completion |
| **CourseEnrollmentActivity** | Course history with final scoring | Permanent audit log |

**Key Design Decisions:**
1. All learners enrolled in a program (`credentialGoal: 'certificate' | 'degree' | 'none'`)
2. ProgramLevel only tracked when `credentialGoal !== 'none'`
3. Every attempt recorded; only final attempt(s) used for grading
4. Grading policies: `final-attempt`, `best-attempt`, `average-all`, `average-last-n`
5. Failed outcomes tracked but can be hidden from learner UI

**Scoring Components:**
- Quiz/Exam attempts (points, percentage, timeSpent)
- Verified media consumption (minutes watched vs required)
- SCORM scores (raw, scaled, completion/success status)

---

### Assessments

#### **Exam** (model/Academic/Exam.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `name` | String (*req) | Display name | ✅ Good | - | |
| `description` | String (*req) | Details | ✅ Good | - | |
| `course` | ObjectId (*req) ref:Course | Parent course | ✅ Good | - | |
| `program` | ObjectId (*req) ref:Program | Parent program | ⚠️ Redundant | Derive from course.programLevel.program | |
| `passMark` | Number | Passing threshold | ✅ Good | - | |
| `totalMark` | Number | Max points | ✅ Good | - | |
| `academicTerm` | ObjectId (*req) ref:AcademicTerm | Term context | ⚠️ May be redundant | Derive from course/class context | |
| `duration` | String | Time limit | ⚠️ String format | Consider Number (minutes) | |
| `examDate` | Date (*req) | Scheduled date | ✅ Good | - | |
| `examTime` | String (*req) | Scheduled time | ⚠️ String format | Consider combining with examDate | |
| `examType` | String | quiz, exam, etc. | ⚠️ No enum | Add enum validation | |
| `examStatus` | enum ['pending', 'live'] | Availability | ✅ Good | - | |
| `questions` | [ObjectId] ref:Question | Questions | ✅ Good | - | |
| `programLevel` | ObjectId ref:ProgramLevel | Level context | ✅ Good | - | |
| `createdBy` | ObjectId (*req) ref:Staff | Creator | ⚠️ Inconsistent | Should ref:Admin like others | |
| `academicYear` | ObjectId (*req) ref:AcademicYear | Year context | ⚠️ May be redundant | Derive from academicTerm | |
| - | - | **Missing: `gradingPolicy`** | 🔴 No policy for retakes | Add gradingPolicy field | **ADD**: See DCV-033 |
| - | - | **Missing: `maxAttempts`** | ⚠️ No attempt limit | Add maxAttempts field | **ADD**: See DCV-033 |

**Recommended Changes:**
1. Add `gradingPolicy: { type: enum, averageCount?: Number }` - See DCV-033
2. Add `maxAttempts: Number` for attempt limits
3. Standardize `createdBy` to ref:Admin
4. Convert duration to Number (minutes)
5. Consider removing redundant program/academicYear (derive from relationships)

---

### System & Configuration

#### **Settings** (model/System/Settings.ts)

| Field | Current Type | Expected Use | Issue | Remedy | Resolution Comments |
|-------|-------------|--------------|-------|--------|---------------------|
| `scope` | enum ['global'] | Scope level | ⚠️ Only 'global' | Extend for department scope | **UPDATE**: Extend to `['global', 'department', 'program']`. See DCV-050 |
| `pagination.defaultLimit` | Number | Default page size | ✅ Good | - | |
| `pagination.maxLimit` | Number | Max page size | ✅ Good | - | |
| `pagination.overrides` | Map | Per-entity overrides | ✅ Good | - | |
| `updatedBy` | ObjectId ref:Admin | Last editor | ✅ Good | - | |
| - | - | **Missing: `features`** | ⚠️ No feature flags | Add feature toggle map | **ADD**: Feature flags with metadata. See DCV-050 |

**Recommended Changes:**
1. Extend scope enum: `['global', 'department', 'program']`
2. Add feature flags with rich metadata:

```typescript
features: [{
  name: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  enabledAt: Date,
  enabledBy: { type: ObjectId, ref: 'User' }
}]
```

**Inheritance Model:**
- Global settings are base defaults
- Department settings inherit from global, can override
- Program settings inherit from department, can override

---

## Cross-Cutting Concerns

### 1. Inconsistent `createdBy` References

| Model | createdBy Ref | Issue | Resolution Comments |
|-------|---------------|-------|---------------------|
| Program | ref: Admin | ✅ | |
| Course | ref: Admin | ✅ | |
| ProgramLevel | ref: Admin | ✅ | |
| CourseContent | ref: Admin | ✅ | |
| CustomContent | ref: Admin | ✅ | |
| Exam | ref: Staff | ⚠️ Inconsistent | **UPDATE**: Change to ref:User. See DCV-038 |
| Question | ref: Staff | ⚠️ Inconsistent | **UPDATE**: Change to ref:User. See DCV-038 |
| ScormPackage | No ref | 🔴 Missing ref | **ADD**: Add `createdBy: ObjectId ref:User`. See DCV-038 |

**Resolution:** Standardize ALL `createdBy` fields to reference `User`:
```typescript
createdBy: { type: ObjectId, ref: 'User', required: true }
```

- With shared `_id` pattern, User._id === Staff._id === Admin._id
- Role-based middleware enforces who can create what
- Schema simply stores the user reference
- No need for `createdByModel` discriminator

---

### 2. Missing User-to-Person Links

All person models (Admin, Staff, Learner) lack a direct link to User:

| Model | Has userId? | Impact | Resolution Comments |
|-------|-------------|--------|---------------------|
| Admin | ❌ No | Cannot find auth record | **RESOLVED**: Shared `_id` pattern - Admin._id === User._id. See DCV-003 |
| Staff | ❌ No | Cannot find auth record | **RESOLVED**: Shared `_id` pattern - Staff._id === User._id. See DCV-004 |
| Learner | ❌ No | Cannot find auth record | **RESOLVED**: Shared `_id` pattern - Learner._id === User._id. See DCV-005 |

**Resolution Approach**: Using shared `_id` pattern with pre-save validation middleware instead of adding separate `userId` fields. See [Data_Consolidation_Validation_Implementation.md](Data_Consolidation_Validation_Implementation.md) for full implementation plan.

**Recommendation:** Add to each:
```typescript
userId: { type: ObjectId, ref: 'User', unique: true, sparse: true }
```

---

### 3. Redundant Email Fields

Email is stored in both User and person models:

| Model | Has email? | User email? | Resolution Comments |
|-------|------------|-------------|---------------------|
| Admin | ✅ Yes | ✅ Yes (duplicate) | |
| Staff | ✅ Yes | ✅ Yes (duplicate) | |
| Learner | ✅ Yes | ✅ Yes (duplicate) | |

**Recommendation:** Keep email in User only; access via userId ref

---

### 4. Inconsistent Naming Conventions

| Pattern | Examples | Recommendation | Resolution Comments |
|---------|----------|----------------|---------------------|
| `*Id` suffix | `courseId`, `learnerId` | Use for display IDs only | |
| ObjectId refs | `course`, `learner` | ✅ Good - no suffix | |
| Embedded status | `programEnrolmentStatuses` | ❌ Use separate collection | |
| Spelling | `Enrolment` vs `Enrollment` | Standardize to `Enrollment` | |

---

## Remediation Priority Matrix

### 🔴 High Priority (Data Integrity)

| Issue | Models Affected | Effort | Impact | Resolution Comments |
|-------|-----------------|--------|--------|---------------------|
| Add User-to-Person links | Admin, Staff, Learner | Medium | High | **PLANNED**: Shared `_id` pattern with pre-save validation. See DCV-001 through DCV-005 |
| Remove Program.learners array | Program | Low | High | **PLANNED**: See DCV-013 |
| Remove Learner.programEnrolmentStatuses | Learner | Medium | High | **PLANNED**: See DCV-029 |
| Remove Program.courses array | Program | Low | High | **PLANNED**: See DCV-015 |
| Remove Staff orphaned fields | Staff | Low | Medium | **PLANNED**: See DCV-036 (course, program, programLevel) |
| Remove Course.description | Course | Low | Low | **PLANNED**: See DCV-037 |
| Standardize createdBy to ref:User | Exam, Question, ScormPackage, etc. | Medium | Medium | **PLANNED**: See DCV-038 |

### 🟡 Medium Priority (Consistency)

| Issue | Models Affected | Effort | Impact | Resolution Comments |
|-------|-----------------|--------|--------|---------------------|
| Remove Admin.email | Admin | Low | Medium | **PLANNED**: Derive from User. See DCV-039 |
| Replace Staff status booleans | Staff | Low | Medium | **PLANNED**: Use status enum. See DCV-040 |
| Remove Learner.email | Learner | Low | Medium | **PLANNED**: Derive from User. See DCV-041 |
| Add Department.status | Department | Low | Medium | **PLANNED**: See DCV-042 |
| Remove Program.duration | Program | Low | Low | **PLANNED**: Duration at Class level. See DCV-043 |
| Remove duplicate department fields | Course, ProgramLevel | Low | Medium | **PLANNED**: Inherit from Program. See DCV-044 |
| Add LearnerProgress refs | LearnerProgress | Low | Medium | **PLANNED**: See DCV-049 |

### 🟢 Low Priority (Enhancement)

| Issue | Models Affected | Effort | Impact | Resolution Comments |
|-------|-----------------|--------|--------|---------------------|
| Add CourseContent segment title | CourseContent | Low | Medium | **PLANNED**: See DCV-045 |
| Remove 'scorm' from CustomContent enum | CustomContent | Low | Low | **PLANNED**: See DCV-046 |
| Add CustomContent.questions | CustomContent | Low | Medium | **PLANNED**: See DCV-047 |
| Add RenderedCourse.css and version | RenderedCourse | Low | Low | **PLANNED**: See DCV-048 |
| Add Settings.features | Settings | Low | Medium | **PLANNED**: Feature flags with scope inheritance. See DCV-050 |

---

## Migration Scripts Needed

Based on this analysis, the following migration scripts should be created:

1. **`add-user-person-links.ts`** - Add userId to Admin, Staff, Learner; backfill existing
2. **`remove-program-arrays.ts`** - Remove learners/courses arrays from Program
3. **`remove-learner-enrollment-statuses.ts`** - Remove embedded programEnrolmentStatuses
4. **`cleanup-staff-fields.ts`** - Remove orphaned Staff fields
5. **`standardize-createdby.ts`** - Add createdByModel where needed
6. **`remove-duplicate-departments.ts`** - Remove department from Course, ProgramLevel

---

## Appendix: Full Field Inventory

See companion document: [Data_Dictionary.md](Data_Dictionary.md) for complete field-by-field documentation.
