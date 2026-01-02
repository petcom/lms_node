# Staff Multi-Department Contract

Base URL: `/api/v1`

## Purpose
Allow a staff user to belong to multiple departments with roles scoped per department.

## Data Shape (Staff Profile)
```
{
  "departmentMemberships": [
    {
      "departmentId": "DEPT_ID",
      "roles": ["instructor", "department-admin", "content-admin", "billing-admin"],
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
}
```

Notes:
- `departmentMemberships` is the source of truth for staff role assignments by department.
- Each `departmentId` should be unique within the array.

## Identity (Admin Staff Create/Update)
POST `/staff/admins/staff/register`
PUT `/staff/admins/staff/:staffId/update`

Body additions:
```
{
  "departmentMemberships": [
    { "departmentId": "DEPT_ID", "roles": ["department-admin"] }
  ]
}
```

## Department Resources (Staff List)
GET `/department-resources/staffusers`

Response additions (for global-admin view):
```
{
  "items": [
    {
      "id": "staff-id",
      "role": "staff",
      "roles": ["instructor"],
      "departmentMemberships": [
        {
          "department": { "id": "dept-id", "name": "Department Name" },
          "roles": ["instructor"]
        }
      ]
    }
  ]
}
```

Notes:
- For scoped staff/admin views, `departmentMemberships` may be filtered to the caller's department scope.
