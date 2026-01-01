# Master Template System Design

## Goal
Provide a master-template system that supports:
- SCORM-only templates
- Custom-only templates
- Hybrid templates (Custom + SCORM)
- Department-owned design standards via a “master-css”
- An editor that previews CSS and shows a “closeness” rating to the department’s master-css

## Scope
- Authoring UI for master templates
- Preview rendering (SCORM mock + custom content mock)
- CSS quality rating against department master-css
- Storage models + API endpoints

## Non-Goals
- Full SCORM upload in templates (use existing SCORM package flow)
- Real-time SCORM player launch in the editor (use mocked SCORM embeds)
- Automated content assembly for every learner (handled by course rendering pipeline)

## Definitions
- **Master Template**: A reusable layout + CSS + metadata that can be applied to custom content or mixed custom + SCORM sequences.
- **Department Master CSS**: The approved base CSS for a department; templates are scored against it.
- **Hybrid Template**: Contains structural placeholders for both custom HTML blocks and SCORM embeds.

## Template Types
1) **SCORM only**
   - Layout describes SCORM regions (iframe containers).
2) **Custom only**
   - Layout describes custom content blocks (HTML/JSON rendering).
3) **Hybrid**
   - Layout includes both SCORM and custom blocks.

## UI/UX Requirements
- Template creation wizard:
  - Name, description, type (scorm/custom/hybrid)
  - Department
  - Base CSS textarea (editable)
  - Optional layout settings (grid, spacing, typography presets)
- Live preview panel:
  - Uses a mock content fixture (sample headings, paragraphs, buttons, quiz blocks)
  - If type includes SCORM, show an iframe placeholder with a “SCORM mock” card
- CSS “closeness” rating:
  - Numeric score (0–100)
  - Visual scale (e.g., red→yellow→green)
  - Show top 3 deviations (properties or selectors)

## Data Model (Proposed)
### DepartmentMasterCSS
```
{
  _id: ObjectId,
  departmentId: ObjectId,
  css: string,
  version: number,
  updatedBy: ObjectId,
  updatedAt: Date
}
```

### MasterTemplate
```
{
  _id: ObjectId,
  name: string,
  description: string,
  type: "scorm" | "custom" | "hybrid",
  departmentId: ObjectId,
  isGlobal: boolean,
  css: string,
  layout: {
    grid?: string,
    regions: Array<{
      id: string,
      kind: "scorm" | "custom",
      title: string
    }>
  },
  score: {
    value: number,
    comparedToVersion: number,
    diffs: Array<{ selector: string, property: string, expected?: string, actual?: string }>
  },
  overrideStatus: "inherited" | "pending" | "approved",
  status: "draft" | "published" | "archived",
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

## API (Proposed)
Base: `/api/v1/templates`

### Master CSS
- GET `/departments/:id/master-css`
- PUT `/departments/:id/master-css`

### Templates
- GET `/templates?departmentId=&type=&status=`
- POST `/templates`
- GET `/templates/:id`
- PATCH `/templates/:id`
- POST `/templates/:id/publish`
- POST `/templates/:id/archive`

### Rating
- POST `/templates/score`
  - Body: `{ departmentId, css }`
  - Response: `{ score: { value, diffs } }`

## Rating Algorithm (Proposed)
1) Normalize CSS:
   - Remove whitespace/comments
   - Expand shorthand where possible
2) Parse into rule map:
   - `{ selector -> { property -> value } }`
3) Compare against DepartmentMasterCSS:
   - Exact matches +1
   - Missing properties: penalty
   - Extra properties: small penalty
   - Value mismatches: medium penalty
4) Score:
   - `score = max(0, 100 - (missing*2 + extra*1 + mismatch*3))`
5) Return top diffs (by weight) for UI hints.

## Preview Rendering
### Custom Mock Content
- Heading levels
- Paragraphs
- Lists
- Callout/alert
- Button set
- Quiz block sample (question + answers)

### SCORM Mock
- Non-interactive card with:
  - Title, duration, status badge
  - Placeholder image
  - “Launch” button (disabled)

## Permissions
- System admin: full access
- Department admin: CRUD within own departments
- Staff: read-only

## Migration Notes
- None required for existing content
- Templates are new, isolated records

## Open Questions
1) Should template CSS inherit from department master-css or fully replace it?
template CSS should inherit - unless "overriden", and "override" requires system admin approval

2) Do we allow per-template overrides of typography tokens?
we allow per-department overrides of typography tokens - with system admin approval

3) Should hybrid templates enforce at least one custom region?
Hybrid templates should enforce one custom region
