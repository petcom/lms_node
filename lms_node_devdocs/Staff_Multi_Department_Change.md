# Staff Multi-Department Membership Change

## Goal
Allow a single staff user to belong to multiple departments, with role assignments scoped per department.

## Summary
Today a staff profile references one department with global subroles. This change introduces a per-department membership list so staff can have different roles in different departments.

## Data Model (Proposed)
### StaffProfile
Add a collection field to represent memberships:
```
"departmentMemberships": [
  {
    "departmentId": "<ObjectId>",
    "roles": ["instructor", "department-admin", "content-admin", "billing-admin"],
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
]
```

Notes:
- `departmentId` can appear multiple times only if the backend supports multiple role sets; otherwise enforce uniqueness by department.
- `roles` are scoped to the department membership and should not be treated as global staff subroles.

## API Contract Updates (Proposed)
### Identity
- `POST /staff/admins/staff/register` accepts `departmentMemberships` (optional).
- `PUT /staff/admins/staff/:staffId/update` accepts `departmentMemberships` updates.

Payload addition:
```
{
  "departmentMemberships": [
    { "departmentId": "...", "roles": ["department-admin"] }
  ]
}
```

### Department Resources
- `GET /department-resources/staffusers` returns per-department roles based on the caller's scope.
- Staff item should include an array when global-admin requests cross-department data:
```
"departmentMemberships": [
  { "department": { "id": "...", "name": "..." }, "roles": ["instructor"] }
]
```

## UI Changes
### User Management - Add User Form
- When role = `staff`, allow multiple department assignments.
- Each assignment captures:
  - department id
  - roles (multi-select via checkboxes)

### Staff Listing
- Display staff roles scoped to the selected department in department resources.
- For global admin views, optionally display a summary count (e.g., "3 departments").

## Migration Plan
1) Backfill existing staff `department` + `roles` into a single `departmentMemberships` entry.
2) Update backend validation to require roles be scoped to membership records.
3) Update UI forms and list rendering.

## Open Questions
- Should department memberships be editable only by global admins or also by department admins within their scope?
- Should a staff member be required to have at least one department membership before account activation?
- How should cross-department display be represented in staff tables (stacked chips vs. summary)?
