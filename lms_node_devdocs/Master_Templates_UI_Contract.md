# Master Templates UI Contract

Base URL: `/api/v1/templates`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: system admin or department admin for create/update (global templates require system admin)
- Staff: read-only

## Data Shapes

### TemplateSummary
```
{
  "id": "template-id",
  "name": "Template Name",
  "type": "scorm" | "custom" | "hybrid",
  "status": "draft" | "published" | "archived",
  "departmentId": "dept-id",
  "isGlobal": true | false,
  "overrideStatus": "inherited" | "pending" | "approved",
  "score": {
    "value": 87,
    "comparedToVersion": 3
  },
  "updatedAt": "ISO-8601"
}
```

### TemplateDetail
```
{
  "id": "template-id",
  "name": "Template Name",
  "description": "Template description",
  "type": "scorm" | "custom" | "hybrid",
  "status": "draft" | "published" | "archived",
  "departmentId": "dept-id",
  "isGlobal": true | false,
  "css": "string",
  "layout": {
    "grid": "string",
    "regions": [
      { "id": "hero", "kind": "custom", "title": "Hero" },
      { "id": "lesson", "kind": "scorm", "title": "Lesson" }
    ]
  },
  "score": {
    "value": 87,
    "comparedToVersion": 3,
    "diffs": [
      { "selector": ".btn", "property": "background-color", "expected": "#000", "actual": "#111" }
    ]
  },
  "overrideStatus": "inherited" | "pending" | "approved",
  "createdBy": "user-id",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

### MasterCSS
```
{
  "departmentId": "dept-id",
  "css": "string",
  "version": 3,
  "updatedBy": "user-id",
  "updatedAt": "ISO-8601"
}
```

### ScoreResponse
```
{
  "status": "success",
  "score": {
    "value": 87,
    "comparedToVersion": 3,
    "diffs": [
      { "selector": ".btn", "property": "background-color", "expected": "#000", "actual": "#111" }
    ]
  }
}
```

## Endpoints

### List Templates
GET `/templates?departmentId=&type=&status=&isGlobal=`

Response:
```
{
  "status": "success",
  "items": [TemplateSummary]
}
```

### Get Template
GET `/templates/:id`

Response:
```
{
  "status": "success",
  "data": TemplateDetail
}
```

### Create Template
POST `/templates`

Body:
```
{
  "name": "Template Name",
  "description": "Template description",
  "type": "scorm" | "custom" | "hybrid",
  "departmentId": "dept-id",
  "isGlobal": false,
  "css": "string",
  "layout": {
    "grid": "string",
    "regions": [
      { "id": "hero", "kind": "custom", "title": "Hero" }
    ]
  }
}
```
Notes:
- `departmentId` is required when `isGlobal` is false or omitted.
- `isGlobal=true` requires system admin.

Response:
```
{ "status": "success", "data": TemplateDetail }
```

### Update Template
PATCH `/templates/:id`

Body:
```
{
  "name": "Template Name",
  "description": "Template description",
  "css": "string",
  "layout": { ... }
}
```

### Publish / Archive
POST `/templates/:id/publish`
POST `/templates/:id/archive`

### Score CSS
POST `/templates/score`

Body:
```
{ "departmentId": "dept-id", "css": "string" }
```

Response: `ScoreResponse`

### Master CSS
GET `/departments/:id/master-css`
PUT `/departments/:id/master-css`

Body (PUT):
```
{ "css": "string" }
```

Response: `MasterCSS`

## UI Rendering Contract

### Preview Payload (local UI shape)
```
{
  "template": TemplateDetail,
  "mockContent": {
    "headings": ["H1", "H2", "H3"],
    "paragraphs": ["Lorem ipsum..."],
    "buttons": ["Primary", "Secondary"],
    "quiz": {
      "question": "Sample question?",
      "answers": ["A", "B", "C", "D"]
    },
    "scorm": {
      "title": "SCORM Sample",
      "duration": "15 min",
      "status": "draft"
    }
  }
}
```

### Rating Scale
- 0–49: Far from master-css (red)
- 50–79: Needs review (yellow)
- 80–100: Within standard (green)

## Validation Rules (UI)
- Hybrid templates require at least one `custom` region.
- `type=scorm` templates cannot have `custom` regions.
- `type=custom` templates cannot have `scorm` regions.

## Approval Flow
- Template CSS inherits master-css by default.
- Overrides require system admin approval (UI should show approval status).
