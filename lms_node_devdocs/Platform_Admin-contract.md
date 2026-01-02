# Platform Admin Contract

Base URL: `/api/v1`

## Permissions Matrix
GET `/permissions/matrix`

Response:
```
{
  "success": true,
  "data": {
    "roles": ["global-admin", "staff", "learner"],
    "permissions": {
      "global-admin": ["..."],
      "staff": ["..."],
      "learner": ["..."]
    }
  }
}
```

## Metrics Summary
GET `/metrics`

Response:
```
{
  "success": true,
  "data": {
    "storage": { "usedBytes": 1234, "usedMB": 1.23 },
    "sessions": { "active": 2 },
    "errors": { "recent": [] },
    "scorm": { "...": "..." },
    "timestamp": "ISO-8601"
  }
}
```
