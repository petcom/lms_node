# LMS API Surface Contract

This document lists the full API surface currently exposed by `lms_node` and
points to the detailed contracts that define payload shapes. It is the index of
record for endpoint coverage.

Base URL: `/api/v1`

## Shared Data Shapes
- `Person` shapes are defined in `lms_node_devdocs/Person_Types.md`.
- Identity endpoints are defined in `lms_node_devdocs/Identity_Contract.md`.
- Programs, ProgramLevels, Courses, CourseContent are defined in
  `lms_node_devdocs/ProgramLevels_Courses_Contract.md`.
- Academic years/terms/year groups are defined in
  `lms_node_devdocs/Academic_Calendar_Contract.md`.
- Enrollments are defined in `lms_node_devdocs/Enrollment_Contract.md`.
- Exams, questions, and results are defined in
  `lms_node_devdocs/Academic_Assessments_Contract.md`.
- Content and SCORM pipeline are defined in `lms_node_devdocs/Content_V1_Contract.md`.
- Department resources and hierarchy shapes are defined in
  `lms_node_devdocs/Department_Resources_UI_Contract.md`.
- Templates are defined in `lms_node_devdocs/Master_Templates_UI_Contract.md`.
- Metrics + permissions are defined in `lms_node_devdocs/Platform_Admin_Contract.md`.

## Authentication + Password
### Auth
- POST `/auth/refresh`
- POST `/auth/logout`
- POST `/auth/logout-all`
- GET `/auth/token-info`

### Password
- POST `/password/forgot`
- PUT `/password/reset/:token`
- POST `/password/validate`
- PUT `/password/change`

## Staff + Admin + Learner Identity
### Staff (Dashboard + Profile)
- POST `/staff/login`
- GET `/staff/profile`
- PUT `/staff/:staffId/update`
- POST `/staff/admin/register` (global-admin only)
- GET `/staff/admin` (global-admin only)
- GET `/staff/:staffId/admin` (global-admin only)
- PUT `/staff/:staffId/update/admin` (global-admin only)
- POST `/staff/packages/:id/publish`
- POST `/staff/packages/:id/unpublish`
- GET `/staff/packages`
- POST `/staff/assignments/assign`
- GET `/staff/classes`
- GET `/staff/dashboard`
- GET `/staff/attempts`
- GET `/staff/assignments`

### Global Admin (Auth + Profile)
- POST `/staff/admins/register`
- POST `/staff/admins/login`
- GET `/staff/admins`
- GET `/staff/admins/profile`
- PUT `/staff/admins/:id`
- PUT `/staff/admins/suspend/staff/:id`
- PUT `/staff/admins/unsuspend/staff/:id`
- PUT `/staff/admins/withdraw/staff/:id`
- PUT `/staff/admins/unwithdraw/staff/:id`
- PUT `/staff/admins/suspend/learner/:id`
- PUT `/staff/admins/unsuspend/learner/:id`
- PUT `/staff/admins/withdraw/learner/:id`
- PUT `/staff/admins/unwithdraw/learner/:id`

### Learners
- POST `/learners/admins/register`
- POST `/learners/login`
- GET `/learners/profile`
- PUT `/learners/update`
- GET `/learners/admin`
- GET `/learners/:learnerID/admin`
- PUT `/learners/:learnerID/update/admin`
- POST `/learners/exams/:examID/write`

## Academic Catalog
### Academic Years / Terms / Year Groups
- See `lms_node_devdocs/Academic_Calendar_Contract.md`.

### Programs / Levels / Courses / CourseContent
- GET `/programs`
- POST `/programs`
- GET `/programs/:id`
- PUT `/programs/:id`
- PATCH `/programs/:id/archive`
- PATCH `/programs/:id/unarchive`

- See `lms_node_devdocs/ProgramLevels_Courses_Contract.md` for ProgramLevel/Course/CourseContent endpoints.

## Enrollments
- See `lms_node_devdocs/Enrollment_Contract.md` for:
  - `/program-enrollments`
  - `/class-enrollments`
  - `/course-enrollments`

## Exams + Questions + Results
### Exams + Questions + Results
- See `lms_node_devdocs/Academic_Assessments_Contract.md`.

## Content (Unified) + SCORM
- See `lms_node_devdocs/Content_V1_Contract.md` for:
  - `/content/*`
  - `/content/scorm/*`

## Departments + Department Resources
- GET `/departments`
- GET `/departments/hierarchy`
- GET `/departments/:id`
- PATCH `/departments/:id`
- GET `/department-resources`
- GET `/department-resources/hierarchy`
- PATCH `/department-resources/department/:id`
- PATCH `/department-resources/staff/:id/role`
- PATCH `/department-resources/staff/:id/department`
- POST `/department-resources/content`
- PATCH `/department-resources/content/:id`
- POST `/department-resources/programs`
- PATCH `/department-resources/programs/:id`
- POST `/department-resources/courses`
- PATCH `/department-resources/courses/:id`

## Templates
- See `lms_node_devdocs/Master_Templates_UI_Contract.md` for `/templates/*` and master-css endpoints.

## Permissions + Metrics
- GET `/permissions/matrix`
- GET `/metrics`
