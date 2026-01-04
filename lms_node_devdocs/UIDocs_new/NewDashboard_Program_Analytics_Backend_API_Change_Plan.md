# NewDashboard Program Analytics Backend API Change Plan

## Purpose
Implement backend endpoints to supply NewDashboard program analytics:
- Completion vs abandonment per program.
- Weekly enrollments over the last N weeks.
- Optional level breakdown for expanded rows.

## Scope (Backend Only)
- Add staff analytics routes under `/api/v1/staff/analytics/*`.
- Build aggregation logic from existing enrollment models.
- Enforce department scope + role access.
- Document endpoints in API surface and contracts.

## Endpoints to Implement
Primary:
- `GET /api/v1/staff/analytics/programs`

Optional expansions:
- `GET /api/v1/staff/analytics/programs/:programId/levels`
- `GET /api/v1/staff/analytics/programs/:programId/levels/:levelId`

Contract reference:
`lms_node_devdocs/Staff_Analytics-contract.md`

## Data Sources
Program + department:
- `model/Academic/Program.ts`

Program enrollment status:
- `model/Academic/ProgramEnrollment.ts`

Program level metadata:
- `model/Academic/ProgramLevel.ts`

Level-level enrollment (if needed for level analytics):
- `model/Academic/CourseEnrollment.ts`

## Aggregation Logic (Proposed)
Programs endpoint:
- `completionRate` = completions within window / total program enrollments.
- `abandonmentRate` = abandoned within window / total program enrollments.
- `activeLearners` = count of active ProgramEnrollment by program.
- `weeklyEnrollments` = histogram of ProgramEnrollment `enrolledAt` over last N weeks.

Levels endpoint:
- Use CourseEnrollment grouped by programLevel with deduped learners.

## Access Control
- Require auth and role in `global-admin | staff`.
- Apply department scoping (via `departmentScope()` middleware).
- `departmentId` query param only allowed for global-admin or scoped staff.

## Implementation Steps
1) Add router + controller under `routes/staff` or a new `routes/analytics` namespace.
2) Add request validation (query params: `weeks`, optional `departmentId`).
3) Implement aggregation pipeline(s) with indexes in mind.
4) Add API surface entry in `lms_node_devdocs/API_Surface-contract.md`.
5) Add tests (aggregation shape + access control).

## Risks / Open Decisions
- **Level analytics**: CourseEnrollment dedupe may be expensive or inaccurate if learners span multiple courses.
- **Abandonment definition**: requires a reliable "activity within window" signal (CourseEnrollment progress/updatedAt).

## Analytics Pull Map (UI)
- Completion vs abandonment: ProgramEnrollment `status` filtered to the weekly window.
- Weekly enrollments: ProgramEnrollment `enrolledAt` grouped by week.
- Level breakdown (optional): CourseEnrollment `programLevel` + learner dedupe.

## Resolved Decisions
1) Completion/abandonment rates are scoped to the `weeks` window.
2) Abandonment = learners who started a course enrollment but have no activity within the window.
3) Level analytics use deduped learners from CourseEnrollment.
