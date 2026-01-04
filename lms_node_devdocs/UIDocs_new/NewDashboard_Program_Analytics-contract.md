# NewDashboard Program Analytics Contract (v1) (Deprecated)

Deprecated in favor of `lms_node_devdocs/Staff_Analytics-contract.md`.

Base URL: `/api/v1/staff/analytics`

## GET `/programs`
Return program-level analytics for the caller's scope.

**Auth:** Required (`staff`, `global-admin`)

**Query Params**
- `weeks` (number, default `4`) — number of weeks to return for enrollment series.
- `departmentId` (optional) — restrict to a department (global-admin or scoped staff only).

**Response 200**
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

## GET `/programs/:programId/levels`
Return program level breakdown for a single program.

**Auth:** Required (`staff`, `global-admin`)

**Response 200**
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

## GET `/programs/:programId/levels/:levelId`
Return detail payload for an expanded program level row.

**Auth:** Required (`staff`, `global-admin`)

**Response 200**
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
