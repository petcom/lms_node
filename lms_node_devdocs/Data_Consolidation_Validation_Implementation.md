# Data Consolidation & Validation Implementation Plan

> **Created**: January 5, 2026  
> **Status**: Planning  
> **Related Document**: [Data_Crosswalk.md](Data_Crosswalk.md)

---

## Executive Summary

This document outlines the implementation plan for consolidating User-to-Person linking using a shared `_id` pattern across User, Admin, Staff, and Learner collections, with validation to enforce referential integrity at the application level.

### Design Decision

**Approach**: Shared `_id` Pattern  
- User, Admin, Staff, and Learner records for the same person share the same `_id`
- `User.role` changes to `User.roles` (array) to support multi-role persons
- Pre-save validation on person models ensures a User record exists with that `_id`

**Why This Approach**:
- Simplifies lookups: `Staff.findById(user._id)` - no joins needed
- Naturally supports multi-role (same person can be Staff AND Learner)
- MongoDB allows same `_id` across different collections
- Application-level validation enforces referential integrity

---

## Enrollment System Redesign

> **Context**: Learners are primarily therapists who may take individual courses (no credential) or pursue certificates/degrees.

### Enrollment Status Decisions

| Status | Description | Terminal? |
|--------|-------------|-----------|
| `applied` | Application submitted, pending review | No |
| `enrolled` | Actively enrolled and participating | No |
| `on-leave` | Approved leave of absence | No |
| `withdrawn` | Exited (voluntary or administrative) | Yes |
| `completed` | Successfully finished | Yes |

### Completion Types (for `completed` status)

| Type | Description |
|------|-------------|
| `with-certificate` | Completed and earned certificate |
| `with-degree` | Completed and earned degree |
| `course-only` | Completed course(s) without credential |
| `other` | Other completion type |

### Withdrawal Handling

- Single `withdrawn` status
- `withdrawalReason`: Free text field capturing why
- `withdrawnAt`: Timestamp of withdrawal
- `withdrawnBy`: Staff/Admin who processed (if administrative)

### Status History (Archive Strategy)

Each enrollment maintains an embedded array of status changes:

```typescript
statusHistory: [{
  status: EnrollmentStatus,
  changedAt: Date,
  changedBy: ObjectId,        // Staff/Admin who made change (null if system)
  reason?: String,            // For withdrawals, leaves, etc.
  notes?: String,             // Additional context
}]
```

**Benefits:**
- Complete audit trail in one document
- No separate archive collection to maintain
- Easy to query "when did status change to X?"
- Atomic updates (no cross-collection sync)

---

## Conflict Resolutions (January 5, 2026)

The following conflicts were identified during schema review and resolved:

### Resolution 1: ProgramEnrollment.department

**Conflict:** ProgramEnrollment schema included `department` field, but DCV-044 removes department fields to inherit from Program.

**Resolution:** Remove `department` from ProgramEnrollment. Inherit via `programEnrollment.program.department`.

### Resolution 2: Quiz Model Reference

**Conflict:** CourseEnrollmentCurrent/Activity referenced `ref: 'Quiz'`, but no Quiz model exists.

**Resolution:** Quiz is a type of Exam (`Exam.examType = 'quiz'`). Update all `quizId` references to `examId` with `examType: 'quiz'`. Merge quiz tracking into exam tracking.

### Resolution 3: Media Model

**Conflict:** CourseEnrollmentCurrent/Activity referenced `ref: 'Media'`, but no Media model exists.

**Resolution:** Create new **Media** model for externally-hosted audio/video/image content with optional comprehension questions.

```typescript
const MediaSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  mediaType: { type: String, enum: ['video', 'audio', 'image'], required: true },
  hostingPlatform: { type: String, enum: ['youtube', 'vimeo', 'soundcloud', 'external', 'other'] },
  externalUrl: { type: String, required: true },
  
  // Duration tracking
  durationMinutes: Number,         // Expected duration for video/audio
  requiredMinutes: Number,         // Minimum verified watch time for completion
  
  // Optional comprehension questions
  questions: [{
    questionText: String,
    questionType: { type: String, enum: ['multiple-choice', 'true-false', 'short-answer'] },
    options: [String],             // For multiple-choice
    correctAnswer: String,
    points: Number
  }],
  
  // Grading
  isGraded: { type: Boolean, default: false },
  passingScore: Number,            // If questions exist
  
  // Metadata
  course: { type: ObjectId, ref: 'Course' },
  department: { type: ObjectId, ref: 'Department' },
  createdBy: { type: ObjectId, ref: 'User', required: true },
  
  // Status
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' }
}, { timestamps: true });
```

**Task Added:** DCV-051

### Resolution 4: createdBy Standardization Scope

**Conflict:** DCV-038 says standardize `createdBy` to `ref:User`, but many models currently use `ref:Admin` or `ref:Staff`.

**Resolution:** Change ALL `createdBy` fields to `ref:User` universally. With shared `_id` pattern, User._id === Staff._id === Admin._id, so this works seamlessly. Role-based middleware handles permissions.

**Models affected:**
- Program, Course, ProgramLevel, CourseContent, CustomContent (currently ref:Admin)
- Exam, Question (currently ref:Staff)
- ScormPackage (currently no ref)
- Media (new model)

### Resolution 5: LearnerProgress Replacement

**Conflict:** LearnerProgress tracks per-content progress, but CourseEnrollmentCurrent/Activity also tracks attempts. Potential duplication.

**Resolution:** **Remove LearnerProgress model**. Replace with CourseEnrollmentActivity which provides equal or better fidelity:

| LearnerProgress Field | CourseEnrollmentActivity Equivalent |
|-----------------------|-------------------------------------|
| `learnerId` | `learner` |
| `courseId` | `course` |
| `contentId` | Tracked in `attemptHistory` per content type |
| `segmentId` | `attemptHistory[].contentId` |
| `contentType` | Discriminated by attempt type (exam, media, scorm) |
| `status` | `outcome` + `attemptHistory[].status` |
| `progressPercent` | `finalScoring.percentage` |
| `score` | `finalScoring.totalPoints` |
| `maxScore` | `finalScoring.maxPoints` |
| `passed` | `outcome === 'passed'` |
| `attemptCount` | `attemptHistory[].length` per content |
| `timeSpentSec` | `attemptHistory[].timeSpent` |
| `lastActivityAt` | Max of `attemptHistory[].attemptedAt` |
| `payload` | `attemptHistory[].payload` (add if needed) |

**SCORM Compatibility:** ScormAttempt data integrates directly into `attemptHistory.scormAttempts` with full CMI data support.

**Task Added:** DCV-052 (Remove LearnerProgress, migrate to CourseEnrollmentActivity)

---

### Enrollment Level Tracking (Credential Goal)

> **Decision**: All course takers must be enrolled in a program. `credentialGoal` can be `'none'` for single-course takers.

**Three-Model Approach:**

| Model | Purpose | Data Lifecycle |
|-------|---------|----------------|
| `ProgramEnrollment` | Program membership + credential tracking | Long-lived, one per learner-program |
| `CourseEnrollmentCurrent` | Active course enrollments | Created on course start, deleted on completion/withdrawal |
| `CourseEnrollmentActivity` | Completed/withdrawn course history | Created when course ends, permanent log |

**ProgramEnrollment.credentialGoal Field:**

```typescript
credentialGoal: {
  type: String,
  enum: ['certificate', 'degree', 'none'],
  required: true,
  default: 'none'
},
targetCredential: {
  type: ObjectId,
  ref: 'Credential'  // Only required when credentialGoal !== 'none'
},
// ProgramLevel NOT tracked when credentialGoal === 'none'
currentProgramLevel: {
  type: ObjectId,
  ref: 'ProgramLevel'  // null/undefined for single-course takers
}
```

**CourseEnrollmentCurrent Schema:**

```typescript
{
  learner: { type: ObjectId, ref: 'Learner', required: true },
  course: { type: ObjectId, ref: 'Course', required: true },
  programEnrollment: { type: ObjectId, ref: 'ProgramEnrollment', required: true },
  enrolledAt: { type: Date, default: Date.now },
  expectedCompletionDate: Date,
  
  // In-progress scoring with attempt history
  progress: {
    examAttempts: [{           // Includes quizzes (Exam.examType = 'quiz')
      examId: { type: ObjectId, ref: 'Exam' },
      examType: String,        // 'quiz', 'exam', 'test', etc.
      attemptNumber: Number,
      points: Number,
      maxPoints: Number,
      percentage: Number,
      attemptedAt: Date,
      timeSpent: Number  // seconds
    }],
    mediaProgress: [{
      mediaId: { type: ObjectId, ref: 'Media' },
      viewedMinutes: Number,
      requiredMinutes: Number,
      verified: Boolean,
      lastViewedAt: Date,
      completedAt: Date,
      questionAttempts: [{     // If media has comprehension questions
        questionIndex: Number,
        answer: String,
        correct: Boolean,
        attemptedAt: Date
      }]
    }],
    scormAttempts: [{
      scormPackageId: { type: ObjectId, ref: 'ScormPackage' },
      attemptNumber: Number,
      score: Number,
      scaledScore: Number,
      completionStatus: String,
      successStatus: String,
      attemptedAt: Date,
      timeSpent: Number,
      suspendData: String  // SCORM bookmark data
    }]
  }
}
```

**CourseEnrollmentActivity Schema:**

```typescript
{
  learner: { type: ObjectId, ref: 'Learner', required: true },
  course: { type: ObjectId, ref: 'Course', required: true },
  programEnrollment: { type: ObjectId, ref: 'ProgramEnrollment', required: true },
  
  // Outcome (failed may be hidden from student in UI)
  outcome: { type: String, enum: ['passed', 'failed', 'withdrawn'], required: true },
  
  // Final scoring (calculated from final attempts only)
  finalScoring: {
    totalPoints: Number,           // Aggregate points from final attempts
    maxPoints: Number,             // Maximum possible points
    percentage: Number,            // Calculated overall percentage
    
    exams: {                       // Combined quiz + exam scoring
      points: Number,
      maxPoints: Number,
      percentage: Number,
      quizPoints: Number,          // Breakdown: quiz portion
      examPoints: Number           // Breakdown: formal exam portion
    },
    media: {
      points: Number,
      maxPoints: Number,
      percentage: Number,
      verifiedMinutes: Number,
      requiredMinutes: Number,
      questionPoints: Number       // Points from comprehension questions
    },
    scorm: {
      points: Number,
      maxPoints: Number,
      scaledScore: Number,         // SCORM 2004 scaled score
      completionStatus: String,    // Aggregated completion
      successStatus: String        // Aggregated success
    }
  },
  
  // Complete attempt history (preserved from CourseEnrollmentCurrent)
  attemptHistory: {
    examAttempts: [{               // Includes quizzes (Exam.examType = 'quiz')
      examId: { type: ObjectId, ref: 'Exam' },
      examType: String,            // 'quiz', 'exam', 'test', etc.
      attemptNumber: Number,
      points: Number,
      maxPoints: Number,
      percentage: Number,
      attemptedAt: Date,
      timeSpent: Number,
      includedInGrade: Boolean,
      answeredQuestions: [{        // Preserve individual answers
        questionId: ObjectId,
        answer: String,
        correct: Boolean,
        points: Number
      }]
    }],
    mediaProgress: [{
      mediaId: { type: ObjectId, ref: 'Media' },
      viewedMinutes: Number,
      requiredMinutes: Number,
      verified: Boolean,
      completedAt: Date,
      questionAttempts: [{
        questionIndex: Number,
        answer: String,
        correct: Boolean,
        points: Number,
        attemptedAt: Date
      }]
    }],
    scormAttempts: [{
      scormPackageId: { type: ObjectId, ref: 'ScormPackage' },
      scormAttemptId: { type: ObjectId, ref: 'ScormAttempt' },  // Link to full CMI data
      attemptNumber: Number,
      score: Number,
      scaledScore: Number,
      completionStatus: String,    // SCORM completion_status
      successStatus: String,       // SCORM success_status
      attemptedAt: Date,
      timeSpent: Number,
      includedInGrade: Boolean,
      // Key CMI data preserved (full data in ScormAttempt)
      lessonLocation: String,
      suspendData: String
    }]
  },
  
  creditsEarned: Number,           // Credits toward credential (if passed)
  
  // Timestamps
  enrolledAt: Date,                // Copied from CourseEnrollmentCurrent
  completedAt: Date,               // When outcome was recorded
  
  // Context
  withdrawalReason: String,        // If outcome === 'withdrawn'
  notes: String,
  
  // Visibility control
  visibleToLearner: { type: Boolean, default: true }  // Hide failed from student if needed
}
```

**Workflow:**
1. Learner starts course → Create `CourseEnrollmentCurrent` record
2. Learner completes/withdraws → Move to `CourseEnrollmentActivity` + delete from Current
3. Query activity by `programEnrollment` to see courses completed toward credential

**Grading Policies:**

Assessments can use different policies for calculating final scores:

| Policy | Description |
|--------|-------------|
| `final-attempt` | Use only the last attempt |
| `best-attempt` | Use the highest scoring attempt |
| `average-all` | Average of all attempts |
| `average-last-n` | Average of last N attempts (e.g., last 3) |

Policy is defined at the assessment level (Quiz, Exam, ScormPackage) and applied when calculating `finalScoring`.

```typescript
// On Quiz/Exam/ScormPackage models
gradingPolicy: {
  type: { 
    type: String, 
    enum: ['final-attempt', 'best-attempt', 'average-all', 'average-last-n'],
    default: 'final-attempt'
  },
  averageCount: Number  // Only used when type === 'average-last-n'
},
maxAttempts: {
  type: Number,
  default: null  // null = unlimited
}
```

**Course-Level Default:**

```typescript
// On Course model
defaultGradingPolicy: {
  type: { 
    type: String, 
    enum: ['final-attempt', 'best-attempt', 'average-all', 'average-last-n'],
    default: 'final-attempt'
  },
  averageCount: Number
}
```

Assessments inherit from course default unless explicitly overridden.

**Upgrade Path**: If a `credentialGoal: 'none'` learner decides to pursue a certificate:
1. Update ProgramEnrollment: `credentialGoal = 'certificate'`, set `targetCredential`
2. Their existing CourseEnrollmentActivity records already link to the ProgramEnrollment
3. Those completed courses count toward the credential

### Proposed ProgramEnrollment Schema

```typescript
const ProgramEnrollmentSchema = new Schema({
  learner: { type: ObjectId, ref: 'Learner', required: true },
  program: { type: ObjectId, ref: 'Program', required: true },
  
  // Credential tracking
  credentialGoal: { 
    type: String, 
    enum: ['certificate', 'degree', 'none'], 
    required: true,
    default: 'none'
  },
  targetCredential: { type: ObjectId, ref: 'Credential' },
  
  // Current status
  status: { 
    type: String, 
    enum: ['applied', 'enrolled', 'on-leave', 'withdrawn', 'completed'],
    default: 'applied'
  },
  
  // Completion details (when status = 'completed')
  completionType: {
    type: String,
    enum: ['with-certificate', 'with-degree', 'course-only', 'other']
  },
  completedAt: Date,
  
  // Withdrawal details (when status = 'withdrawn')
  withdrawalReason: String,
  withdrawnAt: Date,
  withdrawnBy: { type: ObjectId, ref: 'User' },
  
  // Leave details (when status = 'on-leave')
  leaveReason: String,
  leaveStartDate: Date,
  expectedReturnDate: Date,
  
  // Timestamps
  appliedAt: { type: Date, default: Date.now },
  enrolledAt: Date,
  
  // Status history (embedded archive)
  statusHistory: [{
    status: { type: String, enum: ['applied', 'enrolled', 'on-leave', 'withdrawn', 'completed'] },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: ObjectId, ref: 'User' },
    reason: String,
    notes: String
  }]
  
  // NOTE: department is NOT stored - inherit via program.department
}, { timestamps: true });
```

---

## Tasks Overview

| Task ID | Description | Priority | Effort | Dependencies | Status |
|---------|-------------|----------|--------|--------------|--------|
| DCV-001 | Update User schema: role→roles, add primaryRole, rename subroles→staffRoles | High | Medium | None | ✅ Complete |
| DCV-002 | Create shared person validation middleware | High | Medium | DCV-001 | ✅ Complete |
| DCV-003 | Apply validation to Admin model | High | Low | DCV-002 | ✅ Complete |
| DCV-004 | Apply validation to Staff model | High | Low | DCV-002 | ✅ Complete |
| DCV-005 | Apply validation to Learner model | High | Low | DCV-002 | ✅ Complete |
| DCV-006 | Update User TypeScript types | Medium | Low | DCV-001 | ✅ Complete |
| DCV-007 | Update auth middleware for roles array | Medium | Medium | DCV-001, DCV-006 | ✅ Complete |
| DCV-008 | Update roleRestriction middleware | Medium | Medium | DCV-001, DCV-006 | ✅ Complete |
| DCV-009 | Update existing tests | Medium | Medium | DCV-001 through DCV-008 | ✅ Complete |
| DCV-010 | Create migration script for existing data | Low | Medium | DCV-001 | ✅ Complete |
| DCV-011 | Update mock data to use shared _id pattern | Low | Low | DCV-001 | ✅ Complete |
| DCV-012 | Update API documentation | Low | Low | All | ✅ Complete |
| **DCV-013** | **Remove Program.learners array** | **High** | **Low** | **None** | ✅ Complete |
| **DCV-014** | **Remove Program.instructors array** | **High** | **Low** | **None** | ✅ Complete |
| **DCV-015** | **Remove Program.courses array** | **High** | **Low** | **None** | ✅ Complete |
| **DCV-016** | **Remove all Admin orphaned arrays (programs, learners, courses, etc.)** | **High** | **Low** | **None** | ✅ Complete |
| **DCV-017** | **Create cached query service for program aggregations** | **Medium** | **High** | **DCV-013-015** | ✅ Complete |
| **DCV-018** | **Add virtual getters to Program for backwards compatibility** | **Low** | **Medium** | **DCV-013-015** | ✅ Complete |
| **DCV-019** | **Evaluate Course.program redundancy** | **Medium** | **Low** | **None** | ✅ Complete (keeping for perf) |
| **DCV-020** | **Create migration script to remove deprecated arrays** | **Low** | **Medium** | **DCV-013-016** | ✅ Complete |
| **DCV-021** | **Remove Staff.email - derive from User** | **High** | **Low** | **DCV-002** | ✅ Complete |
| **DCV-022** | **Remove Staff.department - use departmentMemberships** | **High** | **Low** | **None** | ✅ Complete |
| **DCV-023** | **Remove Staff.academicYear - context from Calendar/Class** | **High** | **Low** | **DCV-024** | ✅ Complete |
| **DCV-024** | **Document Class model definition and Calendar integration** | **Medium** | **Medium** | **None** | ✅ Complete |
| **DCV-025** | **Create Staff virtual getter for email from User** | **Medium** | **Low** | **DCV-021** | ✅ Complete |
| **DCV-026** | **Redesign ProgramEnrollment with status history + credentialGoal** | **High** | **High** | **None** | ✅ Complete |
| **DCV-027** | **Create CourseEnrollmentCurrent model** | **High** | **Medium** | **DCV-026** | ✅ Complete |
| **DCV-028** | **Create CourseEnrollmentActivity model** | **High** | **Medium** | **DCV-027** | ✅ Complete |
| **DCV-029** | **Remove Learner.programEnrolmentStatuses** | **High** | **Low** | **DCV-026** | ✅ Complete |
| **DCV-030** | **Create enrollment migration script** | **Medium** | **High** | **DCV-026-028** | ✅ Complete |
| **DCV-031** | **Create Credential model (certificates/degrees)** | **Medium** | **Medium** | **None** | ✅ Complete |
| **DCV-032** | **Create course completion workflow (Current → Activity)** | **High** | **Medium** | **DCV-027, DCV-028** | ✅ Complete |
| **DCV-033** | **Add gradingPolicy + maxAttempts to Exam model** | **High** | **Low** | **None** | ✅ Complete |
| **DCV-034** | **Add gradingPolicy to ScormPackage model** | **Medium** | **Low** | **None** | ✅ Complete |
| **DCV-035** | **Add defaultGradingPolicy to Course model** | **Medium** | **Low** | **None** | ✅ Complete |
| **DCV-036** | **Remove Staff legacy fields (course, program, programLevel, examsCreated)** | **High** | **Low** | **None** | ✅ Complete |
| **DCV-037** | **Remove Course.description (use short/longDescription)** | **High** | **Low** | **None** | ✅ Complete |
| **DCV-038** | **~~Standardize all createdBy to ref:User~~** | ~~**High**~~ | ~~**Medium**~~ | **SUPERSEDED by DCV-053** |
| **DCV-039** | **Remove Admin.email - derive from User** | **Medium** | **Low** | **DCV-002** | ✅ Complete |
| **DCV-040** | **Replace Staff.isWithdrawn/isSuspended with status enum** | **Medium** | **Low** | **None** | ✅ Complete |
| **DCV-041** | **Remove Learner.email - derive from User** | **Medium** | **Low** | **DCV-002** | ✅ Complete |
| **DCV-042** | **Add Department.status enum ['active', 'archived']** | **Medium** | **Low** | **None** | ✅ Complete |
| **DCV-043** | **Remove Program.duration - tracked at Class level** | **Medium** | **Low** | **None** | ✅ Complete |
| **DCV-044** | **Remove ProgramLevel.department and Course.department - inherit from Program** | **Medium** | **Low** | **None** | ✅ Complete |
| **DCV-045** | **Add CourseContent segment title field** | **Low** | **Low** | **None** | ✅ Complete |
| **DCV-046** | **Remove 'scorm' from CustomContent.customType enum** | **Low** | **Low** | **None** | ✅ Complete |
| **DCV-047** | **Add CustomContent.questions ref for quiz/exam types** | **Low** | **Low** | **None** | ✅ Complete |
| **DCV-048** | **Add RenderedCourse.css and RenderedCourse.version** | **Low** | **Low** | **None** | ✅ Complete |
| **DCV-049** | **~~Add proper refs to LearnerProgress~~** | ~~**Low**~~ | ~~**Low**~~ | **SUPERSEDED by DCV-052** |
| **DCV-050** | **Add Settings.features with scope inheritance (global/department/program)** | **Low** | **Medium** | **None** | ✅ Complete |
| **DCV-051** | **Create Media model for external hosted content** | **High** | **Medium** | **None** | ✅ Complete |
| **DCV-052** | **Remove LearnerProgress - migrate tracking to CourseEnrollmentActivity** | **High** | **High** | **DCV-027, DCV-028, DCV-051** | ✅ Complete |
| **DCV-053** | **Update all createdBy fields to ref:User (Program, Course, ProgramLevel, CourseContent, CustomContent, Exam, Question, ScormPackage, Media)** | **High** | **Medium** | **DCV-001** | ✅ Complete |

---

## Detailed Task Specifications

### DCV-001: Update User.role to User.roles Array

**File**: `model/Auth/User.ts`

**Current Schema**:
```typescript
role: {
  type: String,
  enum: ['global-admin', 'staff', 'learner', 'guest'],
  default: 'guest'
}
```

**New Schema**:
```typescript
roles: [{
  type: String,
  enum: ['global-admin', 'staff', 'learner', 'guest']
}],
primaryRole: {
  type: String,
  enum: ['global-admin', 'staff', 'learner', 'guest'],
  // Set automatically from roles[0] if not provided
},
staffRoles: [{
  type: String,
  // Renamed from subroles - permissions within staff role
}]
```

**Considerations**:
- Add index on `roles` for efficient querying
- `primaryRole` determines default dashboard after login
- Rename `subroles` → `staffRoles` for clarity
- `guest` remains in enum but indicates unauthenticated/pending state
- Ensure backwards compatibility during migration

**Acceptance Criteria**:
- [ ] Schema updated with `roles` array
- [ ] Schema updated with `primaryRole` field
- [ ] Rename `subroles` to `staffRoles`
- [ ] Enum validation applies to each array element
- [ ] Index created on roles field
- [ ] Pre-save hook sets primaryRole from roles[0] if not provided
- [ ] Unit tests pass

---

### DCV-002: Create Shared Person Validation Middleware

**File**: `middlewares/personValidation.ts` (new file)

**Purpose**: Reusable pre-save middleware that validates:
1. If `_id` is provided, a User with that `_id` must exist
2. Prevents orphaned person records

**Implementation**:
```typescript
import { Schema } from 'mongoose';
import User from '../model/Auth/User';

export function requireUserExists(schema: Schema): void {
  schema.pre('save', async function(next) {
    // Only validate on new documents where _id is explicitly set
    if (this.isNew && this._id) {
      const userExists = await User.exists({ _id: this._id });
      if (!userExists) {
        throw new Error(
          `Cannot create ${this.constructor.modelName} record: ` +
          `No User exists with _id ${this._id}. Create User first.`
        );
      }
    }
    next();
  });
}
```

**Considerations**:
- Should validation run on updates too? (Probably not - _id doesn't change)
- Performance: Single `exists()` query is fast
- Error message should be clear for debugging

**Acceptance Criteria**:
- [ ] Middleware created and exported
- [ ] Throws descriptive error when User doesn't exist
- [ ] Allows save when User exists
- [ ] Skips validation when _id is auto-generated (no explicit _id provided)
- [ ] Unit tests for all scenarios

---

### DCV-003: Apply Validation to Admin Model

**File**: `model/Staff/Admin.ts`

**Changes**:
```typescript
import { requireUserExists } from '../../middlewares/personValidation';

// After schema definition, before model export:
requireUserExists(AdminSchema);
```

**Acceptance Criteria**:
- [ ] Middleware applied to Admin schema
- [ ] Creating Admin without matching User throws error
- [ ] Creating Admin with matching User succeeds
- [ ] Integration tests pass

---

### DCV-004: Apply Validation to Staff Model

**File**: `model/Staff/Staff.ts`

**Changes**: Same pattern as DCV-003

**Acceptance Criteria**:
- [ ] Middleware applied to Staff schema
- [ ] Creating Staff without matching User throws error
- [ ] Creating Staff with matching User succeeds
- [ ] Integration tests pass

---

### DCV-005: Apply Validation to Learner Model

**File**: `model/Academic/Learner.ts`

**Changes**: Same pattern as DCV-003

**Acceptance Criteria**:
- [ ] Middleware applied to Learner schema
- [ ] Creating Learner without matching User throws error
- [ ] Creating Learner with matching User succeeds
- [ ] Integration tests pass

---

### DCV-006: Update User TypeScript Types

**File**: `types/user.ts` (or wherever User types are defined)

**Changes**:
```typescript
// Before
interface IUser {
  role: 'global-admin' | 'staff' | 'learner' | 'guest';
  subroles?: string[];
  // ...
}

// After
type UserRole = 'global-admin' | 'staff' | 'learner' | 'guest';

interface IUser {
  roles: UserRole[];
  primaryRole: UserRole;  // Default dashboard
  staffRoles?: string[];  // Renamed from subroles
  // ...
}
```

**Acceptance Criteria**:
- [ ] Types updated with roles array
- [ ] Types updated with primaryRole
- [ ] subroles renamed to staffRoles in types
- [ ] All TypeScript compilation errors resolved
- [ ] Type exports updated if needed

---

### DCV-007: Update Auth Middleware for Roles Array

**File**: `middlewares/isAuthenticated.ts`

**Changes**:
- Update JWT payload to include `roles` array instead of `role`
- Update token verification to extract roles array
- Update `req.user` type to include roles

**Acceptance Criteria**:
- [ ] JWT tokens include roles array
- [ ] Token verification extracts roles correctly
- [ ] req.user.roles available in controllers
- [ ] Backwards compatible with existing tokens during migration

---

### DCV-008: Update roleRestriction Middleware

**File**: `middlewares/roleRestriction.ts`

**Current Logic** (assumed):
```typescript
if (req.user.role !== requiredRole) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

**New Logic**:
```typescript
export const restrictTo = (...allowedRoles: UserRole[]) => {
  return (req, res, next) => {
    const userRoles = req.user.roles || [];
    const hasPermission = allowedRoles.some(role => userRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Requires one of: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};
```

**Acceptance Criteria**:
- [ ] Middleware checks roles array
- [ ] User with ANY matching role is allowed
- [ ] Clear error messages
- [ ] Unit tests for multi-role scenarios

---

### DCV-009: Update Existing Tests

**Files**: Various test files

**Changes Needed**:
- Update test fixtures to use `roles: ['staff']` instead of `role: 'staff'`
- Add tests for multi-role scenarios
- Update mock users in test setup

**Acceptance Criteria**:
- [ ] All existing tests updated
- [ ] New tests for multi-role users
- [ ] All tests pass

---

### DCV-010: Create Migration Script for Existing Data

**File**: `scripts/migrations/migrate-user-role-to-roles.ts`

**Purpose**: Migrate existing User documents from `role` to `roles`

**Script Logic**:
```typescript
// For each user:
// 1. Read current `role` value
// 2. Set `roles: [role]` 
// 3. Optionally set `primaryRole: role`
// 4. Unset old `role` field

await User.updateMany(
  { role: { $exists: true }, roles: { $exists: false } },
  [
    { $set: { roles: ['$role'], primaryRole: '$role' } },
    { $unset: 'role' }
  ]
);
```

**Acceptance Criteria**:
- [ ] Script migrates all existing users
- [ ] Handles edge cases (null role, etc.)
- [ ] Idempotent (safe to run multiple times)
- [ ] Logs progress and results

---

### DCV-011: Update Mock Data

**File**: `scripts/mock-data/staff.ts`, `scripts/mock-data/learners.ts`

**Changes**:
- Ensure mock Staff/Learner/Admin use same `_id` as their User records
- Update `role` to `roles` in user fixtures

**Note**: Current mock data already uses matching `_id`s - just need to update `role` → `roles`

**Acceptance Criteria**:
- [ ] Mock data uses roles array
- [ ] Seed script still works
- [ ] Mock data validates correctly

---

### DCV-012: Update API Documentation

**Files**: Swagger/OpenAPI specs, README

**Changes**:
- Update User schema in API docs
- Document the shared `_id` pattern
- Update auth endpoint documentation

**Acceptance Criteria**:
- [ ] API docs reflect roles array
- [ ] Shared _id pattern documented
- [ ] Examples updated

---

### DCV-013: Remove Program.learners Array

**File**: `model/Academic/Program.ts`

**Current State**: `learners: [{ type: ObjectId, ref: 'Learner' }]`

**Change**: Remove field entirely

**Derived Query**:
```typescript
// Get learners for a program
const enrollments = await ProgramEnrollment.find({ 
  program: programId, 
  status: 'active' 
}).populate('learner');
const learners = enrollments.map(e => e.learner);
```

**Acceptance Criteria**:
- [ ] Field removed from schema
- [ ] All references in codebase updated to use ProgramEnrollment query
- [ ] Cached query service available (DCV-017)
- [ ] Tests pass

---

### DCV-014: Remove Program.instructors Array

**File**: `model/Academic/Program.ts`

**Current State**: `instructors: [{ type: ObjectId, ref: 'Staff' }]`

**Change**: Remove field entirely

**Derived Query**:
```typescript
// Get instructors for a program via Course assignments
const programLevels = await ProgramLevel.find({ program: programId });
const courses = await Course.find({ 
  programLevel: { $in: programLevels.map(pl => pl._id) }
});
const instructorIds = new Set([
  ...courses.flatMap(c => c.primaryInstructors),
  ...courses.flatMap(c => c.secondaryInstructors)
]);
const instructors = await Staff.find({ _id: { $in: [...instructorIds] } });
```

**Acceptance Criteria**:
- [ ] Field removed from schema
- [ ] Derived query implemented in service layer
- [ ] Cached for performance (DCV-017)
- [ ] Tests pass

---

### DCV-015: Remove Program.courses Array

**File**: `model/Academic/Program.ts`

**Current State**: `courses: [{ type: ObjectId, ref: 'Course' }]`

**Change**: Remove field entirely

**Derived Query**:
```typescript
// Option A: Via Course.program (if kept)
const courses = await Course.find({ program: programId });

// Option B: Via ProgramLevel (follows hierarchy)
const programLevels = await ProgramLevel.find({ program: programId });
const courses = await Course.find({ 
  programLevel: { $in: programLevels.map(pl => pl._id) }
});
```

**Acceptance Criteria**:
- [ ] Field removed from schema
- [ ] Derived query implemented
- [ ] Decision made on Course.program field (DCV-019)
- [ ] Tests pass

---

### DCV-016: Remove Admin.programs Array

**File**: `model/Staff/Admin.ts`

**Current State**: `programs: [{ type: ObjectId, ref: 'Program' }]`

**Change**: Remove field entirely

**Rationale**: Global admins can access all programs. No need for explicit assignment.

**Acceptance Criteria**:
- [ ] Field removed from schema
- [ ] Authorization logic confirms global admin access to all programs
- [ ] Tests pass

---

### DCV-017: Create Cached Query Service for Program Aggregations

**File**: `services/programQueryService.ts` (new file)

**Purpose**: Provide cached derived queries for program-related data

**Implementation**:
```typescript
import { redis } from '../config/redis';

const CACHE_TTL = 300; // 5 minutes

export class ProgramQueryService {
  
  async getLearners(programId: string): Promise<Learner[]> {
    const cacheKey = `program:${programId}:learners`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const enrollments = await ProgramEnrollment.find({ 
      program: programId, 
      status: 'active' 
    }).populate('learner');
    const learners = enrollments.map(e => e.learner);
    
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(learners));
    return learners;
  }
  
  async getInstructors(programId: string): Promise<Staff[]> {
    const cacheKey = `program:${programId}:instructors`;
    // ... similar pattern
  }
  
  async getCourses(programId: string): Promise<Course[]> {
    const cacheKey = `program:${programId}:courses`;
    // ... similar pattern
  }
  
  async invalidateCache(programId: string): void {
    await redis.del(`program:${programId}:learners`);
    await redis.del(`program:${programId}:instructors`);
    await redis.del(`program:${programId}:courses`);
  }
}
```

**Cache Invalidation Triggers**:
- ProgramEnrollment created/updated/deleted → invalidate learners cache
- Course created/updated (instructors changed) → invalidate instructors cache
- Course assigned to ProgramLevel → invalidate courses cache

**Acceptance Criteria**:
- [ ] Service created with all three query methods
- [ ] Redis caching implemented with TTL
- [ ] Cache invalidation hooks added to relevant models
- [ ] Performance tests confirm improvement
- [ ] Fallback to direct query if Redis unavailable

---

### DCV-018: Add Virtual Getters to Program for Backwards Compatibility

**File**: `model/Academic/Program.ts`

**Purpose**: Provide backwards-compatible access to derived data

**Implementation**:
```typescript
import { ProgramQueryService } from '../../services/programQueryService';

// Virtual for learners (not stored, computed on access)
ProgramSchema.virtual('learners').get(async function() {
  const service = new ProgramQueryService();
  return service.getLearners(this._id);
});

// Note: Mongoose virtuals don't support async well
// Alternative: Add instance methods
ProgramSchema.methods.getLearners = async function() {
  const service = new ProgramQueryService();
  return service.getLearners(this._id);
};
```

**Acceptance Criteria**:
- [ ] Instance methods added for getLearners, getInstructors, getCourses
- [ ] Existing code can migrate gradually
- [ ] Documentation updated

---

### DCV-019: Evaluate Course.program Redundancy

**File**: `model/Content/Course.ts`

**Current State**: Course has BOTH `program` and `programLevel` fields

**Analysis**:
- `programLevel` → `ProgramLevel.program` provides the program
- `program` field is therefore redundant

**Options**:
1. **Remove Course.program**: Derive via `course.programLevel.program`
2. **Keep Course.program**: Denormalization for query convenience

**Recommendation**: Keep for now (query performance), but ensure sync via pre-save hook

**Acceptance Criteria**:
- [ ] Decision documented
- [ ] If keeping: Add pre-save hook to sync from programLevel.program
- [ ] If removing: Update all queries to use programLevel path

---

### DCV-020: Create Migration Script to Remove Deprecated Arrays

**File**: `scripts/migrations/remove-deprecated-arrays.ts`

**Changes**:
```typescript
// Remove arrays from Program
await Program.updateMany({}, { 
  $unset: { learners: 1, instructors: 1, courses: 1 } 
});

// Remove array from Admin
await Admin.updateMany({}, { 
  $unset: { programs: 1 } 
});
```

**Acceptance Criteria**:
- [ ] Script removes all deprecated array fields
- [ ] Idempotent (safe to run multiple times)
- [ ] Logs progress and document counts

---

### DCV-021: Remove Staff.email - Derive from User

**File**: `model/Staff/Staff.ts`

**Current State**: `email: { type: String, required: true }`

**Change**: Remove field, add virtual getter

**Implementation**:
```typescript
// Remove from schema, add virtual
StaffSchema.virtual('email').get(async function() {
  const user = await User.findById(this._id);
  return user?.email;
});

// Or use instance method for async
StaffSchema.methods.getEmail = async function() {
  const user = await User.findById(this._id);
  return user?.email;
};
```

**Acceptance Criteria**:
- [ ] Field removed from schema
- [ ] Virtual/method added for backwards compatibility
- [ ] All direct email references updated
- [ ] Tests pass

---

### DCV-022: Remove Staff.department - Use departmentMemberships

**File**: `model/Staff/Staff.ts`

**Current State**: `department: { type: ObjectId, ref: 'Department' }`

**Change**: Remove field, update code to use `departmentMemberships[0]`

**Implementation**:
```typescript
// Add virtual for primary department (first membership)
StaffSchema.virtual('primaryDepartment').get(function() {
  return this.departmentMemberships?.[0]?.departmentId;
});
```

**Acceptance Criteria**:
- [ ] Field removed from schema
- [ ] Virtual added for primaryDepartment
- [ ] All direct department references updated
- [ ] Tests pass

---

### DCV-023: Remove Staff.academicYear - Context from Calendar/Class

**File**: `model/Staff/Staff.ts`

**Current State**: `academicYear: { type: ObjectId, ref: 'AcademicYear' }`

**Change**: Remove field entirely

**Rationale**: Academic year context should come from:
- The Class a staff member is teaching
- The current Calendar/AcademicYear (system-wide)
- Not stored on the Staff record

**Acceptance Criteria**:
- [ ] Field removed from schema
- [ ] Code updated to get academic year from appropriate context
- [ ] Tests pass

---

### DCV-024: Document Class Model Definition and Calendar Integration

**File**: `model/Academic/Class.ts` (existing) + documentation

**Class Definition Clarification**:
> A **Class** is a group of students attending a program (or multiple programs) at the same time.

**Current Understanding**:
- Class has `program` and `programLevel` references
- Class has `startDate` and `endDate`
- Class has `instructors` array

**Calendar Integration**:
- AcademicYear defines the time boundaries
- AcademicTerm subdivides the year
- Classes exist within AcademicTerms
- Staff.academicYear is unnecessary - context comes from Class assignment

**Recommended Schema Updates** (if needed):
```typescript
// Class should have:
academicYear: { type: ObjectId, ref: 'AcademicYear' },
academicTerm: { type: ObjectId, ref: 'AcademicTerm' },
```

**Acceptance Criteria**:
- [ ] Class model reviewed and documented
- [ ] Relationship to Calendar (AcademicYear, AcademicTerm) clarified
- [ ] Updated Data Dictionary with Class definition
- [ ] Consider: Can a Class span multiple programs?

---

### DCV-025: Create Staff Virtual Getter for Email from User

**File**: `model/Staff/Staff.ts`

**Purpose**: Backwards-compatible access to email via User

**Implementation**:
```typescript
// Since virtuals can't be async, use population or instance method
StaffSchema.methods.getEmail = async function(): Promise<string | undefined> {
  const user = await User.findById(this._id).select('email');
  return user?.email;
};

// Or add a pre-find hook to auto-populate
StaffSchema.pre(['find', 'findOne'], function() {
  // Note: This won't work with shared _id pattern
  // Instead, use aggregation $lookup or application-level join
});
```

**Recommended Approach**: Application-level join in service layer
```typescript
async function getStaffWithEmail(staffId: string) {
  const [staff, user] = await Promise.all([
    Staff.findById(staffId),
    User.findById(staffId).select('email')
  ]);
  return { ...staff.toObject(), email: user?.email };
}
```

**Acceptance Criteria**:
- [ ] Method/pattern implemented for email access
- [ ] Documented in service layer
- [ ] Tests pass

---

## Implementation Order

```
Phase 1: Core Schema Changes
├── DCV-001: User.roles array
├── DCV-006: TypeScript types
└── DCV-010: Migration script (create, don't run yet)

Phase 2: Validation Infrastructure  
├── DCV-002: Person validation middleware
├── DCV-003: Apply to Admin
├── DCV-004: Apply to Staff
└── DCV-005: Apply to Learner

Phase 3: Auth System Updates
├── DCV-007: Auth middleware
└── DCV-008: Role restriction middleware

Phase 4: Program Denormalization
├── DCV-024: Document Class/Calendar model
├── DCV-013: Remove Program.learners
├── DCV-014: Remove Program.instructors
├── DCV-015: Remove Program.courses
├── DCV-016: Remove Admin.programs
├── DCV-017: Create cached query service
├── DCV-018: Add virtual getters
├── DCV-019: Evaluate Course.program
└── DCV-020: Migration script for arrays

Phase 5: Staff Cleanup
├── DCV-021: Remove Staff.email
├── DCV-022: Remove Staff.department
├── DCV-023: Remove Staff.academicYear
└── DCV-025: Email virtual getter

```
Phase 1: Core Schema Changes
├── DCV-001: User.roles array
├── DCV-006: TypeScript types
└── DCV-010: Migration script (create, don't run yet)

Phase 2: Validation Infrastructure  
├── DCV-002: Person validation middleware
├── DCV-003: Apply to Admin
├── DCV-004: Apply to Staff
└── DCV-005: Apply to Learner

Phase 3: Auth System Updates
├── DCV-007: Auth middleware
└── DCV-008: Role restriction middleware

Phase 4: Testing & Cleanup
├── DCV-009: Update tests
├── DCV-011: Update mock data
└── DCV-012: Documentation

Phase 5: Migration (Production)
└── Run DCV-010 migration script
```

---

## Test Plan

### Unit Tests

| Test File | Test Cases |
|-----------|------------|
| `tests/models/User.test.ts` | roles array validation, enum validation, default values |
| `tests/middlewares/personValidation.test.ts` | User exists → success, User missing → error, auto-generated _id → skip |
| `tests/middlewares/roleRestriction.test.ts` | single role match, multi-role match, no match → 403 |

### Integration Tests

| Test File | Test Cases |
|-----------|------------|
| `tests/integration/person-creation.test.ts` | Create User then Staff (success), Create Staff without User (fail) |
| `tests/integration/multi-role.test.ts` | User with [staff, learner] can access both dashboards |

---

## Rollback Plan

If issues arise:

1. **Schema rollback**: Keep `role` field during transition, only remove after validation
2. **Middleware rollback**: Validation middleware can be disabled via environment variable
3. **Data rollback**: Migration script should log original values for manual revert

---

## Design Decisions (Resolved)

| Question | Decision | Rationale |
|----------|----------|----------|
| **Primary Role** | ✅ Add `primaryRole` field | Determines default dashboard after login |
| **Guest Role** | ✅ Keep `guest` in roles enum | Handle as unauthenticated/pending state |
| **Subroles** | ✅ Keep separate, rename to `staffRoles` | `roles` = person types, `staffRoles` = permissions within staff role |

---

## Appendix: Related Data Crosswalk Items

| Crosswalk Item | Resolution |
|----------------|------------|
| User: Missing personId | Resolved by shared _id pattern (no field needed) |
| Admin: Missing userId | Resolved by shared _id pattern |
| Staff: Missing userId | Resolved by shared _id pattern |
| Learner: Missing userId | Resolved by shared _id pattern |
| User: role field | Updated to roles array (DCV-001) |
| User: subroles field | Renamed to staffRoles (DCV-001) |
| User: primaryRole | Added for default dashboard (DCV-001) |
| Program.learners | Remove - derive from ProgramEnrollment (DCV-013) |
| Program.instructors | Remove - derive from Course instructors (DCV-014) |
| Program.courses | Remove - derive from ProgramLevel.courses (DCV-015) |
| Admin.programs | Remove - global admins access all (DCV-016) |
| Staff.email | Remove - derive from User via shared _id (DCV-021) |
| Staff.department | Remove - use departmentMemberships (DCV-022) |
| Staff.academicYear | Remove - context from Calendar/Class (DCV-023) |
