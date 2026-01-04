# NewDashboard Program Analytics API Proposal

## Purpose
Define efficient backend APIs to support program-level analytics on NewDashboard:
- Completion vs abandonment metrics per program.
- New enrollments per program for the last 4 weeks.

## Recommended Core API (MVP)
### GET `/api/v1/staff/analytics/programs`
Returns program-level analytics for the staff member's scope.

**Query Params**
- `weeks=4` (default 4) — number of weeks for new enrollments series.
- `departmentId` (optional; for global admins or scoped staff).

**Definitions**
- **Weekly window**: `weeks` × 7 days ending at request time.
- **Abandonment (windowed)**: learners who started a course enrollment but have
  no activity within the weekly window (CourseEnrollment progress/updatedAt).

**Response**
```json
{
  "status": "success",
  "data": [
    {
      "programId": "program-1",
      "programName": "STEM Foundations",
      "completionRate": 0.74,
      "abandonmentRate": 0.09,
      "activeLearners": 186,
      "weeklyEnrollments": [12, 18, 21, 15]
    }
  ]
}
```

## Optional Expansion APIs
### GET `/api/v1/staff/analytics/programs/:programId/levels`
Returns the level breakdown for an expanded program.

**Response**
```json
{
  "status": "success",
  "data": [
    {
      "levelId": "level-1",
      "levelName": "Level 1",
      "completionRate": 0.78,
      "abandonmentRate": 0.08,
      "activeLearners": 62,
      "weeklyEnrollments": [5, 7, 6, 4]
    }
  ]
}
```

### GET `/api/v1/staff/analytics/programs/:programId/levels/:levelId`
Returns the detail payload for the program-level analytics placeholder.

**Response**
```json
{
  "status": "success",
  "data": {
    "programId": "program-1",
    "levelId": "level-1",
    "courses": [],
    "learners": []
  }
}
```

## Nice-to-Have Enhancements
- Include `timeRange` or `dateRange` in queries to control reporting windows.
- Add `trend` objects for completion/abandonment to show week-over-week deltas.
- Provide `programStatus` metadata (active/archived) for filtering.
- Add `permissions` metadata for UI gating by role.

## Notes on Efficiency
- Prefer a single programs endpoint that returns both completion/abandonment and weekly enrollments to avoid multiple requests per program.
- If the data volume grows, support pagination or top-N ordering in the programs endpoint.

## Decisions (Resolved)
1) Completion/abandonment rates are scoped to the `weeks` window.
2) Abandonment is based on inactivity within the window, not `withdrawn` alone.
3) Level analytics can use deduped learners from CourseEnrollment.
