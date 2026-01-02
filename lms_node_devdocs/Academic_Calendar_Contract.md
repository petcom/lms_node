# Academic Calendar Contract

Base URL: `/api/v1`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: `global-admin` for create/update/delete; `staff` can read.

## Academic Years
### Create
POST `/academic-years`

Body:
```
{
  "name": "2024-2025",
  "fromYear": "2024-01-01",
  "toYear": "2025-12-31",
  "isCurrent": false
}
```

Response:
```
{
  "status": "success",
  "data": {
    "_id": "year-id",
    "name": "2024-2025",
    "fromYear": "2024-01-01T00:00:00.000Z",
    "toYear": "2025-12-31T00:00:00.000Z",
    "isCurrent": false
  }
}
```

### List
GET `/academic-years`

### Detail
GET `/academic-years/:id`

### Update
PUT `/academic-years/:id`

### Delete
DELETE `/academic-years/:id`

## Academic Terms
### Create
POST `/academic-terms`

Body:
```
{
  "name": "1st Term",
  "description": "Fall term",
  "duration": "3 months"
}
```

### List
GET `/academic-terms`

### Detail
GET `/academic-terms/:id`

### Update
PUT `/academic-terms/:id`

### Archive / Unarchive
PATCH `/academic-terms/:id/archive`
PATCH `/academic-terms/:id/unarchive`

## Year Groups
### Create
POST `/year-groups`

Body:
```
{
  "name": "Year Group A",
  "academicYear": "academic-year-id"
}
```

### List
GET `/year-groups`

### Detail
GET `/year-groups/:id`

### Update
PUT `/year-groups/:id`

### Delete
DELETE `/year-groups/:id`
