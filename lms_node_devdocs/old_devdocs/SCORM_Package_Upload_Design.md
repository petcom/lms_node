# SCORM Package Upload API Design

- [x] Implement POST /api/v1/scorm/packages (multipart/form-data) with instructor/admin JWT auth
- [x] Enforce zip mime and max size; return 413 on oversize
- [x] Validate required fields (file, title); optional fields: subject, classLevel, program, isGraded, maxScore, dueDate; 400 on invalid
- [x] Parse imsmanifest.xml to extract launch href, version, title; 400 on missing/invalid manifest
- [x] Derive metadata (packageId UUID, launchUrl/entryPoint, fileSize); set status=draft, isPublished=false; set createdBy/uploadedBy
- [x] Persist package record and store file with unique path
- [x] Cleanup temp/unzip dirs; guard against zip bombs/virus as needed
- [x] Keep upload separate from publish (use existing publish endpoint)
- [x] Add audit logging (uploader id/timestamp) and optional event emit
- [x] Integration tests: valid zip → 201; invalid manifest → 400; oversize → 413; unauthorized/forbidden → 401/403
- [x] Document performance limits (max upload size, timeouts) for UI

## Storage Behavior

- Development: store packages on local filesystem using `SCORM_STORAGE_PROVIDER=local` and `SCORM_STORAGE_PATH` from .env (current: `./scorm-content/packages`).
- Production: store and serve packages from S3/CDN per .env (`SCORM_STORAGE_PROVIDER` set to S3; bucket/region/endpoint configured; `CDN_ENABLED=true` with `CDN_URL`/`CDN_SCORM_PATH`).

## Endpoint

- `POST /api/v1/scorm/packages` (multipart/form-data)
- Auth: instructor/admin JWT; 401/403 otherwise

### Request Contract

- Parts: `file` (zip, required), `title` (required)
- Optional: `subject`, `classLevel`, `program`, `isGraded` (bool), `maxScore` (number), `dueDate` (ISO)
- Enforce zip type/size; 400 on invalid/missing; 413 on oversize

### Processing

- Save zip to storage (local or S3) with unique path; record `fileSize`
- Unzip to temp; parse `imsmanifest.xml`; extract launch href, SCORM version, package title; ensure resources exist
- Generate `packageId`; set `version` from manifest; set `launchUrl/entryPoint`; set `status=draft`, `isPublished=false`; set `createdBy`/`uploadedBy` from JWT
- Cleanup temp/unzip artifacts

### Response (201)

```json
{
  "id": "...",
  "packageId": "...",
  "title": "...",
  "status": "draft",
  "isPublished": false,
  "version": "scorm_1.2",
  "launchUrl": "index.html",
  "fileSize": 12345,
  "updatedAt": "...",
  "createdAt": "...",
  "uploadedBy": "..."
}
```

### Errors

- 400: validation/manifest parse failure
- 401/403: auth/role failure
- 413: payload too large
- 500: unexpected (log details)

### Notes

- No auto-publish on upload; use publish endpoint separately
- Consider background job for heavy parsing/caching if needed; expose status if deferred
- Emit activity/audit event with uploader id and timestamp

## Package Table Pagination & Filters

- [x] Backend: ensure packages endpoint supports page/limit/search/status filters and returns pagination metadata
- [ ] UI: add paging controls plus search/status inputs; store page/filter state, refetch on change, render total/pageSize

### Listing Endpoint Contract (for UI)

- `GET /api/v1/scorm/packages`
- Query params: `page` (number, default 1), `limit` (number, default 10), `search` (matches title/description), `status` (e.g., draft/published), `subject`, `program`, `classLevel`, `isPublished` (true/false).
- Response shape:

```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "packageId": "...",
      "title": "...",
      "status": "draft",
      "isPublished": false,
      "version": "scorm_1.2",
      "launchUrl": "index.html",
      "fileSize": 12345,
      "createdAt": "...",
      "uploadedBy": { "name": "...", "email": "...", "role": "Instructor" },
      "subject": { "_id": "...", "name": "..." },
      "program": { "_id": "...", "name": "..." },
      "classLevel": { "_id": "...", "name": "..." }
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 25, "pages": 3 }
}
```

## Upload Form Fields (subject/program/classLevel)

- [ ] Confirm backend field names/IDs and allowed values for subject, program, classLevel; fetch options if enumerated
- [ ] Add form inputs (selects/text) and pass through upload payload; validate required fields and surface backend errors

### Upload Field Names & Formats (for UI)

- Fields accepted by `POST /api/v1/scorm/packages` body: `subject`, `subjectId`, `program`, `programId`, `classLevel`, `classLevelId` (string ObjectId values). Any of these may be provided; controller uses the first truthy value per field.
- Preferred: send `subject`, `program`, `classLevel` as ObjectId strings; omit unused fields.
- Other form fields: `title` (required string), `description` (optional string), `isGraded` (boolean string accepted, e.g., "true"/"false"), `maxScore` (number), `dueDate` (ISO string), plus `file` (zip, required).
- Behavior: values are persisted on create and surfaced in listing responses with populated names where available.
