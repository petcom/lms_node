# Course UI Recommendations

**Created:** January 5, 2026  
**Status:** Active  
**Audience:** Frontend Development Team  
**Reference:** [Course_API_Completion_Plan.md](Course_API_Completion_Plan.md)

---

## Overview

This document provides UI implementation recommendations for the Course management interface, with a focus on the instructor selector component and its interaction with the backend staff search API.

---

## Instructor Selector Component

### API Endpoint

```
GET /api/v1/staff/by-department/:departmentId
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "displayName": "John Smith",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john.smith@example.com"
    }
  ]
}
```

---

### Recommended Implementation

#### 1. Data Fetching Strategy

The backend provides the **complete department staff list** from Redis cache. The UI should:

1. **Fetch once per department** — When the course's department is known, fetch the full staff list for that department
2. **Cache locally** — Store the staff list in component state or a client-side cache (React Query, SWR, or local state)
3. **Filter client-side** — As the user types, filter the cached list rather than making new API calls

```typescript
// Pseudocode example
const [staffList, setStaffList] = useState<Staff[]>([]);
const [searchTerm, setSearchTerm] = useState('');

// Fetch on mount or department change
useEffect(() => {
  fetchDepartmentStaff(departmentId).then(setStaffList);
}, [departmentId]);

// Filter locally
const filteredStaff = useMemo(() => {
  if (!searchTerm) return staffList;
  const term = searchTerm.toLowerCase();
  return staffList.filter(staff => 
    staff.firstName.toLowerCase().startsWith(term) ||
    staff.lastName.toLowerCase().startsWith(term) ||
    staff.displayName.toLowerCase().includes(term)
  );
}, [staffList, searchTerm]);
```

---

#### 2. Filtering Logic

**Recommended matching behavior:**

| User Types | Matches |
|------------|---------|
| `jo` | Staff where firstName OR lastName starts with "jo" |
| `smith` | Staff where firstName OR lastName starts with "smith" |
| `john s` | Staff where displayName contains "john s" |

**Priority order for results:**
1. Exact first name match
2. First name starts with search term
3. Last name starts with search term
4. Display name contains search term

---

#### 3. Dropdown Behavior

**When staff list is large (>20 items):**

| State | Behavior |
|-------|----------|
| **Empty search** | Show first 20 items + "Type to search..." hint |
| **Typing** | Filter and show all matching results |
| **No matches** | Show "No staff found matching '{term}'" |
| **Scrollable** | Allow scroll within dropdown (max-height with overflow) |

**Recommended dropdown styling:**
```css
.instructor-dropdown {
  max-height: 300px;
  overflow-y: auto;
}

.instructor-option {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
}

.instructor-option .email {
  color: #666;
  font-size: 0.875rem;
}
```

---

#### 4. Display Format

**Dropdown item format:**
```
John Smith                    john.smith@example.com
```

**Selected instructor chip format:**
```
[John Smith] ✕
```

---

#### 5. Multi-Select Handling

For both `primaryInstructors` and `secondaryInstructors` arrays:

1. Allow multiple selections
2. Show selected instructors as removable chips above the dropdown
3. Exclude already-selected instructors from the dropdown options
4. Prevent adding the same instructor to both primary and secondary lists

```typescript
const availableStaff = useMemo(() => {
  const selectedIds = new Set([
    ...primaryInstructors.map(i => i._id),
    ...secondaryInstructors.map(i => i._id)
  ]);
  return filteredStaff.filter(staff => !selectedIds.has(staff._id));
}, [filteredStaff, primaryInstructors, secondaryInstructors]);
```

---

### Validation Messages

Display validation before save/publish:

| Condition | Message | Severity |
|-----------|---------|----------|
| No primary instructor (on publish) | "At least one primary instructor is required to publish" | Error |
| No instructors at all (on save) | — (allowed, no message) | — |

**Note:** The backend will also enforce the primary instructor requirement on publish (returns 400), but the UI should validate proactively for better UX.

---

## Description Field Limits

The backend now supports increased character limits:

| Field | Max Length | UI Recommendation |
|-------|------------|-------------------|
| `shortDescription` | 500 characters | Show character counter, truncate preview after ~150 chars |
| `longDescription` | 5000 characters | Show character counter, consider rich text editor |

**Character counter component:**
```
Short Description (127/500)
[                                          ]

Long Description (1,847/5000)
[                                          ]
[                                          ]
[                                          ]
```

---

## Course Status Display

### Status Badge Styling

| Status | Color | Icon |
|--------|-------|------|
| `draft` | Gray | ○ (empty circle) |
| `rendered` | Yellow/Amber | ◐ (half circle) |
| `published` | Green | ● (filled circle) |

### Status Transition UI

| Current Status | Available Actions |
|----------------|-------------------|
| `draft` | "Render" button (if segments exist) |
| `rendered` | "Publish" button, "Edit" returns to draft |
| `published` | "Unpublish" button |

**Publish button disabled states:**
- Disabled if no primary instructor (with tooltip: "Add a primary instructor to publish")
- Disabled if status is not `rendered` (with tooltip: "Render course content first")

---

## API Endpoint Reference

### Course Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Get course with segments | GET | `/api/v1/courses/:id` |
| Update course | PATCH or PUT | `/api/v1/courses/:id` |
| Publish | POST or PATCH | `/api/v1/courses/:id/publish` |
| Unpublish | POST or PATCH | `/api/v1/courses/:id/unpublish` |
| Render | POST | `/api/v1/content/courses/:id/render` |

### Staff Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Get department staff | GET | `/api/v1/staff/by-department/:departmentId` |

### List Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| Course statuses | GET | `/api/v1/lists/course-statuses` |

---

## Error Handling

### Expected Error Responses

**Publish without instructor:**
```json
{
  "status": "error",
  "message": "Course must have at least one primary instructor before publishing",
  "errors": [
    {
      "field": "primaryInstructors",
      "message": "At least one primary instructor is required"
    }
  ]
}
```

**UI should:**
1. Display the error message in a toast/alert
2. Highlight the Primary Instructors field
3. Scroll to the instructor section if not visible

---

## Related Documents

- [Course_API_Completion_Plan.md](Course_API_Completion_Plan.md) — Backend implementation plan
- [Course_API_Contract_Recommendation.md](Course_API_Contract_Recommendation.md) — Full API contract specification
