# Course Catalog ERD (Current + Proposed Fields)

This ERD shows the current relationships and proposed fields to support a course catalog
with published status, short/long descriptions, and primary/secondary instructors.

```mermaid
erDiagram
  DEPARTMENT ||--o{ PROGRAM : "has programs"
  PROGRAM ||--o{ PROGRAM_LEVEL : "has levels"
  PROGRAM ||--o{ COURSE : "derived from levels (read-only)"
  PROGRAM_LEVEL ||--o{ COURSE : "contains courses"

  COURSE ||--o{ COURSE_CONTENT : "has segments"
  COURSE ||--o{ RENDERED_COURSE : "renders"
  COURSE ||--o{ CLASS : "taught in cohorts"

  CLASS }o--o{ STAFF : "instructors"

  COURSE_CONTENT }o--|| SCORM_PACKAGE : "segment (scormPackageId)"
  COURSE_CONTENT }o--|| CUSTOM_CONTENT : "segment (customContentId)"

  STAFF }o--|| COURSE : "assigned (staff.course)"

  %% Proposed: explicit instructor roles per course
  COURSE }o--o{ COURSE_INSTRUCTOR : "proposed primary/secondary"
  COURSE_INSTRUCTOR }o--|| STAFF : "proposed instructor"

  %% Proposed: lookup values
  LOOKUP ||--o{ COURSE : "status values"

  DEPARTMENT {
    ObjectId _id
  }
  PROGRAM {
    ObjectId _id
    ObjectId department
    %% Proposed: derived read-only field
    ObjectId[] courses
  }
  PROGRAM_LEVEL {
    ObjectId _id
    ObjectId program
    ObjectId department
    %% Proposed field
    ObjectId[] courses
  }
  COURSE {
    ObjectId _id
    ObjectId program
    ObjectId programLevel
    ObjectId department
    string title
    string description
    date updatedAt
    %% Proposed fields
    string shortDescription
    string longDescription
    string status  "draft|rendered|published"
    date publishedAt
    ObjectId publishedBy
    ObjectId primaryInstructors[]
    ObjectId secondaryInstructors[]
  }
  COURSE_CONTENT {
    ObjectId _id
    ObjectId course
    string contentType
    ObjectId scormPackageId
    ObjectId customContentId
    %% Proposed fields
    string shortDescription
    string longDescription
  }
  SCORM_PACKAGE {
    ObjectId _id
    ObjectId course
    ObjectId program
    ObjectId programLevel
    ObjectId department
    string status
    bool isPublished
    date updatedAt
  }
  CUSTOM_CONTENT {
    ObjectId _id
    string title
    string customType "exam|quiz|exercise|scorm|custom"
  }
  RENDERED_COURSE {
    ObjectId _id
    ObjectId courseId
    date contentVersion
    date updatedAt
  }
  CLASS {
    ObjectId _id
    ObjectId program
    ObjectId programLevel
    ObjectId department
    string name "cohort name"
  }
  STAFF {
    ObjectId _id
    ObjectId course
  }
  COURSE_INSTRUCTOR {
    ObjectId _id
    ObjectId course
    ObjectId staff
    string role "primary|secondary"
  }
  LOOKUP {
    ObjectId _id
    string group "CourseStatus"
    string value "draft|rendered|published"
  }
```

## Proposed Fields Summary
- `Course.shortDescription`, `Course.longDescription` (or keep `description` as long description)
- `Course.status` (`draft|rendered|published`)
- `Course.publishedAt`, `Course.publishedBy`
- `CourseInstructor` join for primary/secondary instructors per course

If you want a lighter-weight approach, we can skip `CourseInstructor` and encode
`primaryInstructor`/`secondaryInstructors` on `Course` directly.
