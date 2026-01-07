# Course API Contract Recommendations

## Purpose
Document the API endpoint requirements and changes needed in `lms_node` to support Phase 4 (Course Detail / Edit) and Phase 5 (Analytics & Polish) of the Course UI implementation.

## References
- `lms_ui-devdocs/Course_UI_Implementation_Plan.md`
- `lms_ui-devdocs/Course_Catalog_Mongo_Mapping.md`
- `lms_ui-devdocs/Content_V1-contract.md`
- `lms_ui-devdocs/API_Surface-contract.md`

---

## Required Course Model Fields

The UI expects the following fields on the `Course` entity. Please confirm all fields are available on `GET` and updatable via `PATCH` where indicated.

| Field | Type | GET | PATCH | Description |
|-------|------|-----|-------|-------------|
| `id` | `string` | ✅ | ❌ | Course unique identifier |
| `title` | `string` | ✅ | ✅ | Course title |
| `shortDescription` | `string` | ✅ | ✅ | Brief description (for catalog/cards) |
| `longDescription` | `string` | ✅ | ✅ | Full description (for detail page) |
| `status` | `enum` | ✅ | ✅ | One of: `draft`, `rendered`, `published` |
| `programLevelId` | `string \| null` | ✅ | ✅ | Associated program level |
| `departmentId` | `string \| null` | ✅ | ✅ | Owning department |
| `primaryInstructors` | `string[]` | ✅ | ✅ | Array of staff IDs |
| `secondaryInstructors` | `string[]` | ✅ | ✅ | Array of staff IDs |
| `segments` | `CourseSegment[]` | ✅ | ❌ | Course content segments (managed via CourseContent endpoints) |
| `createdAt` | `string (ISO)` | ✅ | ❌ | Creation timestamp |
| `updatedAt` | `string (ISO)` | ✅ | ❌ | Last update timestamp |
| `publishedAt` | `string (ISO) \| null` | ✅ | ❌ | When course was last published |
| `publishedBy` | `string \| null` | ✅ | ❌ | Staff ID who published |

---

## Endpoint Requirements

### 1. Course Detail
**Endpoint:** `GET /api/v1/courses/:id`

**Requirements:**
- Return full course model including all fields above
- Include `segments` array with ordered course content
- Include instructor arrays resolved or as IDs (UI can resolve names)

**UI Usage:** `CourseDetailPage` read-only view

---

### 2. Course Update
**Endpoint:** `PATCH /api/v1/courses/:id`

**Request Body:**
```json
{
  "title": "string (optional)",
  "shortDescription": "string (optional)",
  "longDescription": "string (optional)",
  "status": "draft | rendered | published (optional)",
  "programLevelId": "string | null (optional)",
  "departmentId": "string | null (optional)",
  "primaryInstructors": ["staffId1", "staffId2"] (optional),
  "secondaryInstructors": ["staffId1"] (optional)
}
```

**Requirements:**
- Partial updates supported (only provided fields are updated)
- Validate instructor IDs exist
- Update `updatedAt` timestamp on any change
- Return updated course object

**UI Usage:** `CourseEditorPage` form save

---

### 3. Course Publish Action
**Endpoint:** `POST /api/v1/courses/:id/publish`

**Request Body:** (none or optional metadata)

**Requirements:**
- Set `status` to `published`
- Set `publishedAt` to current timestamp
- Set `publishedBy` to authenticated user's staff ID
- Trigger catalog update (per existing catalog sync logic)
- Return updated course object

**Response:**
```json
{
  "id": "course-123",
  "status": "published",
  "publishedAt": "2026-01-05T12:00:00Z",
  "publishedBy": "staff-456",
  ...
}
```

**UI Usage:** Publish button on `CourseDetailPage` and `CourseCatalogPage` row actions

---

### 4. Course Unpublish Action
**Endpoint:** `POST /api/v1/courses/:id/unpublish`

**Request Body:** (none)

**Requirements:**
- Revert `status` to `draft` (or `rendered` if previously rendered)
- Clear or retain `publishedAt`/`publishedBy` (recommend: retain for audit trail)
- Update catalog (remove from public catalog if applicable)
- Return updated course object

**UI Usage:** Unpublish button on `CourseDetailPage` (for published courses)

---

### 5. Course Render Action
**Existing Endpoint:** `POST /api/v1/courses/:id/render`

**Confirm Requirements:**
- Sets `status` to `rendered` after processing
- Returns updated course or render status

**UI Usage:** Render button on `CourseDetailPage`, `CourseRenderPage`

---

### 6. Course Status List
**Endpoint:** `GET /api/v1/lists/course-statuses`

**Response:**
```json
[
  { "id": "draft", "label": "Draft" },
  { "id": "rendered", "label": "Rendered" },
  { "id": "published", "label": "Published" }
]
```

**Requirements:**
- Return list of valid course status values
- Used by UI for status dropdown options

**UI Usage:** Status dropdown in `CourseEditorPage`

---

### 7. Staff List with Department Filter
**Existing Endpoint:** `GET /api/v1/staff`

**Required Query Params:**
| Param | Type | Description |
|-------|------|-------------|
| `departmentId` | `string` | Filter staff by department |
| `search` | `string` | Search by name/email for autocomplete |
| `limit` | `number` | Limit results (default 20) |

**Response:**
```json
{
  "data": [
    { "id": "staff-1", "displayName": "Jane Doe", "email": "jane@example.com" },
    { "id": "staff-2", "displayName": "John Smith", "email": "john@example.com" }
  ],
  "total": 50
}
```

**UI Usage:** `InstructorSelector` component for assigning primary/secondary instructors

---

## Status Transition Rules

Please confirm the valid status transitions:

| Current Status | Allowed Transitions |
|----------------|---------------------|
| `draft` | → `rendered`, → `published` (skip render?) |
| `rendered` | → `published`, → `draft` (re-edit?) |
| `published` | → `draft` (unpublish) |

**Questions for API team:**
1. Can a course be published directly from `draft` without rendering first?
2. Does unpublishing revert to `draft` or `rendered`?
3. Are there any automatic status transitions (e.g., render completes async)?

---

## Validation Rules

The UI will enforce these client-side; please confirm server-side validation:

| Field | Validation |
|-------|------------|
| `title` | Required, non-empty, max 200 chars |
| `shortDescription` | Optional, max 500 chars |
| `longDescription` | Optional, max 5000 chars |
| `primaryInstructors` | At least 1 required before publish |
| `status` | Must be valid enum value |
| `departmentId` | Required |

---

## Error Responses

Expected error format for validation failures:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    { "field": "title", "message": "Title is required" },
    { "field": "primaryInstructors", "message": "At least one primary instructor required" }
  ]
}
```

---

## Open Questions for API Team

1. **Publish without render:** Should UI allow direct `draft` → `published` transition, or enforce rendering first?

2. **Instructor validation:** Should instructor IDs be validated against department membership, or can any staff be assigned?

3. **Unpublish behavior:** Does unpublish remove from catalog immediately, or on a schedule?

4. **Async render:** If render is async, how should UI poll for completion? WebSocket, polling endpoint, or callback?

5. **Audit trail:** Are `publishedAt`/`publishedBy` retained after unpublish for history?

6. **Analytics events:** Does the API emit events for `course:created`, `course:rendered`, `course:published` that the UI should display or track?

---

## Timeline Alignment

| UI Phase | API Dependencies | Status |
|----------|------------------|--------|
| Phase 4: Course Detail/Edit | Course PATCH with new fields, Publish/Unpublish endpoints, Staff search | **Needed** |
| Phase 5: Analytics & Polish | Analytics events, Access control checks | **Needed** |

Please confirm endpoint availability and any adjustments to the contract above.
