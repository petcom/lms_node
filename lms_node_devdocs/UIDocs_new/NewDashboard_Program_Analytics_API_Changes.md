# NewDashboard Program Analytics API Changes

## Summary
Add program analytics endpoints to support NewDashboard charts:
- Completion vs abandonment per program.
- Weekly enrollments for the last N weeks.
- Optional program-level breakdown for expanded rows.

These endpoints are proposed under `/api/v1/staff/analytics/*` and will be
authorized for `staff` and `global-admin` users.

## New Endpoints
- `GET /api/v1/staff/analytics/programs`
- `GET /api/v1/staff/analytics/programs/:programId/levels` (optional expansion)
- `GET /api/v1/staff/analytics/programs/:programId/levels/:levelId` (optional expansion)

Contract reference:
`lms_node_devdocs/Staff_Analytics-contract.md`

## Data Sources (Current Models)
**Programs + departments**
- `model/Academic/Program.ts` (`department`, `archived`)

**Program enrollment status**
- `model/Academic/ProgramEnrollment.ts`
  - `status` (`active`, `completed`, `withdrawn`)
  - `enrolledAt`, `completedAt`, `withdrawnAt`

**Program level metadata**
- `model/Academic/ProgramLevel.ts`

**Level-level enrollment (if needed)**
- `model/Academic/CourseEnrollment.ts` (`programLevel`, `status`)

## Analytics Calculations (Proposed)
**Programs endpoint**
- `completionRate`: completions within window / total program enrollments.
- `abandonmentRate`: abandoned within window / total program enrollments.
- `activeLearners`: count of `active` ProgramEnrollment for the program.
- `weeklyEnrollments`: histogram of ProgramEnrollment `enrolledAt` over the last N weeks.

**Levels endpoint**
Two possible approaches (needs decision):
1) Use `CourseEnrollment` with `programLevel` to compute level metrics, counting unique learners.
2) Derive from ProgramEnrollment if level association exists elsewhere (not present today).

## Access Control
Use existing scope logic (e.g. `departmentScope()` middleware):
- Filter by `program.department` for `departmentId` scoping.
- For staff users, limit programs to accessible departments.

## Known Gaps / Potentially Hard Parts
- **Level analytics source**: there is no ProgramLevel enrollment model; using CourseEnrollment may double-count learners across courses unless deduped.
- **Abandonment definition**: requires a reliable "activity within window" signal (CourseEnrollment progress/updatedAt).

## Analytics Pull Map (UI)
- Program chart A (completion vs abandonment): ProgramEnrollment `status` filtered to the weekly window.
- Program chart B (weekly enrollments): ProgramEnrollment `enrolledAt`, grouped weekly.
- Expanded level rows (optional): ProgramLevel + CourseEnrollment (deduped learners).

## Resolved Decisions
1) Completion/abandonment rates are scoped to the `weeks` window.
2) Abandonment = learners who started a course enrollment but have no activity within the window.
3) Level analytics can use deduped learners from CourseEnrollment.
