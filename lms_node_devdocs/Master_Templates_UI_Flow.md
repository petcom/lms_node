# Master Templates UI Flow

## Template Creation Wizard
1) **Basics**
   - Name (required)
   - Description (optional)
   - Template type: `scorm` | `custom` | `hybrid` (required)
   - Scope: Department or Global
     - Global requires system admin approval

2) **Layout**
   - Grid preset (optional)
   - Regions:
     - `scorm` type: only scorm regions
     - `custom` type: only custom regions
     - `hybrid`: at least one custom region
   - Region fields: `id`, `kind`, `title`

3) **Styles**
   - CSS editor (textarea)
   - Inherits department master CSS by default
   - Override warning + approval state if override requested

4) **Review**
   - Summary of template settings
   - Score preview (CSS closeness)
   - Publish toggle (blocked if override pending)

## Live Preview Panel
- Two-pane view: CSS editor + preview
- Preview uses mock content blocks:
  - Headings (H1/H2/H3)
  - Paragraphs + list
  - Buttons
  - Quiz block
  - SCORM mock card (if template includes scorm regions)
- Preview renders the master CSS + override CSS

## CSS Closeness Rating
### Goal
Show how closely the template CSS matches the department’s master CSS.

### Inputs
- `master-css` for the department
- Template CSS (override)

### Output
- Score (0–100)
- Passing style score threshold (default 80)
- Top diffs (selector/property/value mismatches)
 - Passing style score is inherited from the department (parent chain, master fallback)

### Algorithm (Summary)
1) Normalize CSS (strip comments, collapse whitespace)
2) Parse rules into `{ selector -> { property -> value } }`
3) Compare against master CSS:
   - Missing properties: penalty
   - Extra properties: penalty
   - Mismatched values: penalty
4) Score:
   - `score = max(0, 100 - (missing*2 + extra*1 + mismatch*3))`
   - `passingStyleScore = department.passingStyleScore (inherited; default 80 when unset)`
5) Display top diffs (highest penalty first)

## Approval UX
- Override status: `inherited` | `pending` | `approved`
- If `pending`, show lock icon and disable publish button
