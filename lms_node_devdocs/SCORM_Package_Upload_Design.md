# SCORM Package Upload API Design

- [ ] Implement POST /api/v1/scorm/packages (multipart/form-data) with teacher/admin JWT auth
- [ ] Enforce zip mime and max size; return 413 on oversize
- [ ] Validate required fields (file, title); optional fields: subject, classLevel, program, isGraded, maxScore, dueDate; 400 on invalid
- [ ] Parse imsmanifest.xml to extract launch href, version, title; 400 on missing/invalid manifest
- [ ] Derive metadata (packageId UUID, launchUrl/entryPoint, fileSize); set status=draft, isPublished=false; set createdBy/uploadedBy
- [ ] Persist package record and store file with unique path
- [ ] Cleanup temp/unzip dirs; guard against zip bombs/virus as needed
- [ ] Keep upload separate from publish (use existing publish endpoint)
- [ ] Add audit logging (uploader id/timestamp) and optional event emit
- [ ] Integration tests: valid zip → 201; invalid manifest → 400; oversize → 413; unauthorized/forbidden → 401/403
- [ ] Document performance limits (max upload size, timeouts) for UI

## Storage Behavior

- Development: store packages on local filesystem using `SCORM_STORAGE_PROVIDER=local` and `SCORM_STORAGE_PATH` from .env (current: `./scorm-content/packages`).
- Production: store and serve packages from S3/CDN per .env (`SCORM_STORAGE_PROVIDER` set to S3; bucket/region/endpoint configured; `CDN_ENABLED=true` with `CDN_URL`/`CDN_SCORM_PATH`).

## Endpoint

- `POST /api/v1/scorm/packages` (multipart/form-data)
- Auth: teacher/admin JWT; 401/403 otherwise

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
