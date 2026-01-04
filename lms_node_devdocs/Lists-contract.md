# Lists Contract (v1)

Base URL: `/api/v1/lists`

## GET `/staff-roles`
Returns the lookup list of staff subroles for UI assignment and display.

**Auth:** Required (roles: `global-admin`, `staff`)

**Response 200**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "ROLE_ID",
      "name": "instructor",
      "description": "Instructor",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```
