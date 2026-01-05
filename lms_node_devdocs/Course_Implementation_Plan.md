# Course Catalog Implementation Plan

## Purpose
Implement the course catalog model and APIs described in:
- `lms_node_devdocs/Course_Catalog_ERD.md`
- `lms_node_devdocs/Course_Catalog_Mongo_Mapping.md`

## Goals
- Program → ProgramLevel → Course hierarchy with ProgramLevel as source of truth for courses.
- Course metadata includes short/long descriptions and published status.
- Course segments support short/long descriptions and unified CustomContent types.
- Course instructor assignment includes primary + secondary arrays.
- Course status values exposed via lookup list.

## Phase 1: Schema + Data Model
1) **ProgramLevel**
   - Add `courses: ObjectId[]` (source of truth).
2) **Program**
   - Add `courses: ObjectId[]` as derived/read-only (populated from levels).
3) **Course**
   - Add `shortDescription`, `longDescription`.
   - Add `status` (`draft|rendered|published`), `publishedAt`, `publishedBy`.
   - Add `primaryInstructors: ObjectId[]`, `secondaryInstructors: ObjectId[]`.
4) **CourseContent**
   - Add `shortDescription`, `longDescription`.
5) **CustomContent**
   - Update `customType` enum to `exam|quiz|exercise|scorm|custom`.
6) **Lookup**
   - Add `CourseStatus` values (`draft`, `rendered`, `published`).

## Phase 2: API Updates
1) **ProgramLevel routes**
   - Accept `courses[]` in create/update.
   - Return `courses[]` in responses.
2) **Program routes**
   - Return `courses[]` as derived field (read-only).
3) **Course routes**
   - Accept `shortDescription`, `longDescription`, `primaryInstructors[]`, `secondaryInstructors[]`.
   - Manage `status/publishedAt/publishedBy` via publish/unpublish actions or in update flows.
4) **CourseContent routes**
   - Accept/return `shortDescription`, `longDescription`.
5) **Lists**
   - Add `GET /api/v1/lists/course-statuses`.

## Phase 3: Data Migration + Backfill
- Backfill `ProgramLevel.courses[]` from existing Course records.
- Populate derived `Program.courses[]` on read or via a background sync.
- Normalize CustomContent types (`practice/other` → `exercise/custom`).
- Set initial Course.status:
  - `published` if content is published and course rendered.
  - `rendered` if RenderedCourse exists but not published.
  - `draft` otherwise.

## Phase 4: Tests + Validation
- Update model tests for new fields.
- Add API integration tests for ProgramLevel courses, Course status, and Lists.
- Verify backward compatibility for existing course and content APIs.

## Open Decisions
- Define authoritative source for instructor assignment (Course vs Class).
Instructors create courses - department-admins add them to program-levels, and then combine program-levels into programs.  Classes can be created by department-admins - as a "class" should only refer to a cohort or group of students that are working through a program at the same time. 

- Decide whether Course.status is fully manual or derived from render/publish actions.
course.status should be controled almost entirely by render/publish/de-publish actions

- Confirm if CustomContent should allow `scorm` as a customType or remain SCORM-only.
CustomContent remains the home for exams/quizzes/exercises/custom items; CourseContent keeps `contentType` (`custom|scorm`). CustomContent customType expands to `exam|quiz|exercise|scorm|custom`.
