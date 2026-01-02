# Course Render: JSON + SCORM Composition

## Goal
Support courses that combine custom (non-SCORM) content and SCORM segments by rendering a static course page. The page embeds SCORM player iframes and renders custom JSON/HTML/CSS fragments into the layout. Rendered output should be cached for fast delivery and re-rendered only when content changes.

## Core Idea
- **Custom content** is stored as JSON/HTML/CSS fragments and rendered into a template (e.g., Handlebars).
- **SCORM content** is embedded as iframe(s) with launch URLs.
- The API is polled for a rendered course page. If the course is already cached and unchanged, return it immediately. Otherwise, render and cache on first access or after updates.

## Rendering Flow
1) Client requests a course render (or a course page URL).
2) API checks render cache for a valid, up-to-date render.
3) If cache hit:
   - Return rendered HTML immediately.
4) If cache miss or stale:
   - Load course definition (custom segments + SCORM segments).
   - Render custom segments via template engine.
   - Build SCORM iframe URLs per segment.
   - Compose final HTML page.
   - Store output in cache (and/or persisted render store).
   - Return rendered HTML.

## Cache Strategy
- Cache key: `{courseId}:{contentVersion}` or `{courseId}:{updatedAt}`
- Invalidate cache on:
  - Course content change
  - SCORM package updates
  - Template changes
- Optional TTL as a safety fallback.

## Proposed Data Model (Conceptual)
Course
```
{
  "id": "course-id",
  "title": "Course Title",
  "updatedAt": "...",
  "segments": [
    {
      "type": "custom",
      "template": "course-section",
      "data": { ... },
      "assets": { "css": "...", "html": "..." }
    },
    {
      "type": "scorm",
      "packageId": "scorm-package-id",
      "launchUrl": "/api/v1/scorm/player/launch/...",
      "height": 720
    }
  ]
}
```

RenderedCourse
```
{
  "courseId": "course-id",
  "contentVersion": "2025-01-01T00:00:00.000Z",
  "html": "<html>...</html>",
  "createdAt": "...",
  "updatedAt": "..."
}
```

## API Shape (Conceptual)
- `GET /api/v1/content/courses/:id/render`
  - Returns rendered HTML (cached or freshly rendered).
- `POST /api/v1/content/courses/:id/render`
  - Forces re-render (admin only).

## SCORM Embed Notes
- Embed SCORM player iframes with signed or session-bound launch URLs.
- Ensure each iframe session is user-specific and tracked.
- Use CSP to limit iframe sources to trusted domains.

## Security & Permissions
- Enforce access checks for course visibility.
- Signed launch URLs or per-session tokens for SCORM player.
- Sanitize custom HTML/CSS fragments to prevent injection.

## Open Questions
1) Where should rendered HTML be stored (Redis, S3, DB)?
2) Should the cache be per-user or per-course?
3) How to version templates and invalidate renders on template changes?
4) Should course rendering be synchronous or queued (async job)?

