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

---

## Important Notes (EVIP Phase 2)

### Department Storage Pattern (DCV-022)

**Staff Model:**
- The legacy `department` field has been **removed** from the Staff schema
- All department associations are now managed via `departmentMemberships[]` array
- Use `staff.getPrimaryDepartment()` to get the first department (for backward compatibility)
- The `getPrimaryDepartment()` method returns the `departmentId` from the first membership

**Example Usage:**
```javascript
// ❌ WRONG - legacy field no longer exists
const deptId = staff.department;

// ✅ CORRECT - use getPrimaryDepartment() method
const deptId = staff.getPrimaryDepartment();

// ✅ Or access departmentMemberships directly
const allDepartments = staff.departmentMemberships.map(m => m.departmentId);
```

### Course/ProgramLevel Department Inheritance (DCV-044)

**Course and ProgramLevel Models:**
- The `department` field has been **removed** from Course and ProgramLevel schemas
- Department is now inherited from the parent Program via `getDepartment()` method
- This ensures department consistency across the Program hierarchy

**Example Usage:**
```javascript
// ❌ WRONG - legacy field no longer exists
const deptId = course.department;

// ✅ CORRECT - use getDepartment() method (populated Program required)
const course = await Course.findById(id).populate('programId');
const deptId = course.getDepartment();
```

### API Response Changes
- Staff responses now include `departmentMemberships[]` array
- Course/ProgramLevel responses inherit department from their Program
- Legacy `department` field is not included in responses
