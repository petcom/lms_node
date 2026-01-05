# Course Catalog Mongo Mapping (Current Models)

This document maps the ERD entities to the current MongoDB collections
as implemented in this repo.

## Collections and Fields

### departments
**Model:** `model/Academic/Department.ts`  
**Key fields:** `_id`, `name`, `code`, `level`, `parent`, `ancestors`

### programs
**Model:** `model/Academic/Program.ts`  
**Key fields:** `_id`, `name`, `description`, `department`, `instructors[]`, `learners[]`, `archived`, `archivedAt`
**Proposed:** `courses[]` as a read-only derived field populated from child program levels.

### programlevels
**Model:** `model/Academic/ProgramLevel.ts`  
**Key fields:** `_id`, `program`, `name`, `order`, `department`, `archived`, `archivedAt`
**Proposed:** add `courses[]` (ObjectId list) for direct programLevel → courses mapping.

### courses
**Model:** `model/Content/Course.ts`  
**Key fields:** `_id`, `title`, `description`, `program`, `programLevel`, `department`, `isArchived`, `archivedAt`, `createdBy`, `createdAt`, `updatedAt`
**Proposed:** `shortDescription`, `longDescription`, `status`, `publishedAt`, `publishedBy`,
`primaryInstructors[]`, `secondaryInstructors[]`

### coursecontents
**Model:** `model/Academic/CourseContent.ts`  
**Key fields:** `_id`, `course`, `contentType`, `scormPackageId`, `customContentId`, `order`, `isRequired`, `createdBy`
**Proposed:** `shortDescription`, `longDescription`

### renderedcourses
**Model:** `model/Content/RenderedCourse.ts`  
**Key fields:** `_id`, `courseId`, `contentVersion`, `html`, `createdAt`, `updatedAt`

### classes
**Model:** `model/Academic/Class.ts`  
Represents a cohort/group of learners moving through a program level together.  
**Key fields:** `_id`, `name`, `program`, `programLevel`, `department`, `instructors[]`, `startDate`, `endDate`

### staffs
**Model:** `model/Staff/Staff.ts`  
**Key fields:** `_id`, `name`, `email`, `department`, `departmentMemberships[]`, `course`

### scormpackages
**Model:** `model/Scorm/ScormPackage.ts`  
**Key fields:** `_id`, `packageId`, `title`, `course`, `program`, `programLevel`, `department`, `status`, `isPublished`, `publishedAt`, `unpublishedAt`, `updatedAt`

### customcontents (custom content)
**Model:** `model/Content/CustomContent.ts`  
**Key fields:** `_id`, `title`, `customType`, `payload`, `department`, `createdBy`
**CustomType values:** `exam`, `quiz`, `exercise`, `scorm`, `custom`

### lookups (course status)
**Model:** `model/System/Lookup.ts`  
**Proposed lookup entries:** `CourseStatus` with values `draft`, `rendered`, `published`

## Relationship Mapping

### Department → Program → ProgramLevel → Course
- `Program.department` → `departments._id`
- `ProgramLevel.program` → `programs._id`
- `Course.program` → `programs._id`
- `Course.programLevel` → `programlevels._id`
- `Course.department` → `departments._id`

### Course → Segments (CourseContent)
- `CourseContent.course` → `courses._id`
- `CourseContent.scormPackageId` → `scormpackages._id`
- `CourseContent.customContentId` → `customcontents._id`

### Course → Rendered Course
- `RenderedCourse.courseId` → `courses._id`

### Course → Class → Staff (Instructors)
- `Class.program` → `programs._id`
- `Class.programLevel` → `programlevels._id`
- `Class.instructors[]` → `staffs._id`

### Staff → Course (single assignment)
- `Staff.course` → `courses._id`

## Proposed Fields Not Yet Modeled
- ProgramLevel `courses[]` for explicit one-to-many mapping.
- Program `courses[]` as read-only derived mapping from program levels.
- Course published status (`status`, `publishedAt`, `publishedBy`)
- Short vs long description fields (`shortDescription`, `longDescription`)
- CourseContent short/long descriptions.
- Course primary/secondary instructor arrays.
- Primary/secondary instructors per course (proposed `CourseInstructor` join or explicit fields on `Course`)
- CustomContent `customType` values aligned to `exam|quiz|exercise|scorm|custom`.
- Course status lookup values: `draft`, `rendered`, `published`.

## Proposed Schema Changes
1) **ProgramLevel**
   - Add `courses: ObjectId[]` (source of truth for program → courses mapping).
2) **Program**
   - Add `courses: ObjectId[]` as read-only/derived from child program levels (no direct writes).
3) **Course**
   - Add `shortDescription`, `longDescription`.
   - Add `status` (`draft|rendered|published`), `publishedAt`, `publishedBy`.
   - Add `primaryInstructors: ObjectId[]`, `secondaryInstructors: ObjectId[]`.
4) **CourseContent**
   - Add `shortDescription`, `longDescription`.
5) **CustomContent**
   - Align `customType` enum to `exam|quiz|exercise|scorm|custom`.
6) **Lookup**
   - Add `CourseStatus` group values: `draft`, `rendered`, `published`.

## Implementation Notes
- **Program → courses derivation**: populate Program.courses from ProgramLevel.courses on read
  (or via a background sync job); avoid writes to Program.courses.
- **Instructor assignment**: decide whether instructors are sourced from Class.cohorts,
  Course.primary/secondary arrays, or both; keep a single source of truth.
- **Status semantics**: define what transitions set `rendered` vs `published` and which system
  actions update `publishedAt/publishedBy`.
- **CustomContent migration**: map existing `practice/other` to `exercise/custom` if the enum changes.
