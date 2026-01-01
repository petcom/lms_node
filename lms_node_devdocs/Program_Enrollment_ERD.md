# Program Enrollment Entity Diagram

## Definitions
- **Class**: A cohort of learners working through a program at the same time.
- **Course**: A grouping of learning segments, including custom and SCORM objects, that should be completed and tracked as a unit.
- **Program**: A predefined set of courses; results are tracked at the program level.

## Scope
Track multi-program enrollment per learner, program-level completion, and course completion within each program.

## Entities
### Learner
- `id`, `name`, `email`, `password`
- Global status: `globalStatus` (`active | inactive`)
- Legacy flags: `isSuspended`, `isWithdrawn` (candidate for deprecation)

### Program
- `id`, `name`, `departmentId`, `code`, `description`
- Owns program-defined levels and courses

### ProgramLevel (replaces ClassLevel)
- `id`, `programId`, `name`, `order`, `description`
- Defined by department/admin per program
- Conceptually acts like a sub-program segment within a full Program

### ProgramEnrollment
- `id`, `learnerId`, `programId`
- `status`: `active | completed | withdrawn`
- `enrolledAt`, `completedAt`, `completionPct`
- Tracks completion per program

### Class (Program Cohort)
- `id`, `programId`, `name`, `startDate`, `endDate`
- `levelId` (ProgramLevel)

### ClassEnrollment
- `id`, `learnerId`, `classId`
- `status`: `active | completed | withdrawn`
- `progressPct`, `completedAt`
- Tracks progress per class (cohort)

### Course
- `id`, `programId`, `levelId`
- `title`, `description`, `order`
- Completion tracked per course

### CourseEnrollment
- `id`, `learnerId`, `courseId`
- `status`: `active | completed | withdrawn`
- `progressPct`, `completedAt`
- Aggregates segment results (custom + SCORM)

### CourseContent (unified)
- `id`, `courseId`
- `contentType`: `custom | scorm`
- `customContentId` (for custom content)
- `scormPackageId` (for SCORM content)
- `title`, `order`, `required`

### CustomContent (Exam/Quiz/Practice/Other)
- `id`, `title`, `customType`, `gradingPolicy`

### ScormPackage
- `id`, `title`, `status`, `version`

### ContentAttempt (unified)
- `id`, `learnerId`, `courseContentId`
- `contentType`: `custom | scorm`
- `status`, `score`, `startedAt`, `completedAt`
- `scormData` (optional: CMI/session/runtime fields)

## Relationships
- Learner 1..* → ProgramEnrollment ← *..1 Program
- Program 1..* → ProgramLevel
- Program 1..* → Class
- ProgramLevel 1..* → Class (optional link)
- Learner 1..* → ClassEnrollment ← *..1 Class
- Program 1..* → Course
- ProgramLevel 1..* → Course
- Learner 1..* → CourseEnrollment ← *..1 Course
- Course 1..* → CourseContent
- CourseContent 1..1 → CustomContent (when `contentType=custom`)
- CourseContent 1..1 → ScormPackage (when `contentType=scorm`)
- Learner 1..* → ContentAttempt ← *..1 CourseContent

## Aggregation Rules
- **Program completion** is derived from CourseEnrollment records (and/or explicit completion criteria).
- **Class progress** is derived from CourseEnrollment for courses tied to the class’s ProgramLevel.
- **Learner level** exists only in ProgramEnrollment or CourseEnrollment context, not on Learner.

## Clarifying Notes
- ProgramLevel represents a defined segment of a Program (sub-program).
- Classes enroll into a ProgramLevel to align cohorts to that segment.

## Notes for Future Tasks
- Replace ClassLevel usages with ProgramLevel in data models and APIs.
- Add `globalStatus` to Learner and deprecate `isSuspended/isWithdrawn` where possible.
- Attach SCORM and custom content to Course via CourseContent (not directly to Program or Class).
- Add enrollment tables/collections: ProgramEnrollment, ClassEnrollment, CourseEnrollment.
- Define program completion thresholds (e.g., all courses completed, or required percentage).
