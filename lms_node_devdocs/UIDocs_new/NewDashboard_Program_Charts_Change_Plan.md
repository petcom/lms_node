# NewDashboard Program Charts Change Plan

## Goal
Update NewDashboard program charts to show:
- [UI] Completion + Abandonment metrics in a single chart per program.
- [UI] New enrollments in the last 4 weeks in a separate chart per program.

## Scope
- [UI] UI-only change for the NewDashboard program analytics panel.
- [UI] Use mock data until backend endpoints are available.
- [UI] Keep per-program expand/collapse behavior intact.

## Planned UI Changes
1) [UI] Replace current per-program single chart with two charts:
   - [UI] **Chart A: Completion vs Abandonment** (stacked bar or dual bar).
   - [UI] **Chart B: New Enrollments (last 4 weeks)** (small bar chart across 4 weeks).

2) [UI] Add mock badge in the Programs section header to indicate mock data.

3) [UI] Update mock data model to include:
   - [UI] `completionRate` (percent)
   - [UI] `abandonmentRate` (percent)
   - [UI] `weeklyEnrollments` (array of 4 weekly counts)

## Implementation Steps
1) [UI] Update mock data shapes in `src/api/newDashboard.ts`.
2) [UI] Adjust Program chart component(s) in `src/features/staff/NewDashboardPage.tsx` to render:
   - [UI] Completion vs Abandonment chart.
   - [UI] New enrollments chart for last 4 weeks.
3) [UI] Update tests in `tests/unit/newDashboardPage.test.tsx` if needed.

## Acceptance Criteria
- [UI] Each program row renders two charts.
- [UI] Completion and abandonment are shown together in one chart.
- [UI] New enrollments chart shows 4 weekly points.
- [UI] No regression in expand/collapse or navigation.

## Notes
- [UI] If chart density becomes too high, consider a compact sparkline for enrollments.
