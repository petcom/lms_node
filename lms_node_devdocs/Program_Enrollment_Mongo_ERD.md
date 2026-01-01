# Program Enrollment MongoDB Entity Diagram

## Goal
Provide a MongoDB-compatible entity diagram based on the program enrollment ERD, with collections, fields, and references optimized for document storage.

## Collections (Proposed)

### learners
```
{
  _id: ObjectId,
  name: string,
  email: string,
  password: string,
  globalStatus: "active" | "inactive",
  isSuspended?: boolean,
  isWithdrawn?: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### programs
```
{
  _id: ObjectId,
  name: string,
  code?: string,
  description?: string,
  departmentId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### programLevels
```
{
  _id: ObjectId,
  programId: ObjectId,
  name: string,
  order: number,
  description?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### programEnrollments
```
{
  _id: ObjectId,
  learnerId: ObjectId,
  programId: ObjectId,
  status: "active" | "completed" | "withdrawn",
  completionPct?: number,
  enrolledAt: Date,
  completedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### classes
```
{
  _id: ObjectId,
  programId: ObjectId,
  levelId: ObjectId, // ProgramLevel
  name: string,
  startDate?: Date,
  endDate?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### classEnrollments
```
{
  _id: ObjectId,
  learnerId: ObjectId,
  classId: ObjectId,
  status: "active" | "completed" | "withdrawn",
  progressPct?: number,
  enrolledAt: Date,
  completedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### courses
```
{
  _id: ObjectId,
  programId: ObjectId,
  levelId: ObjectId, // ProgramLevel
  title: string,
  description?: string,
  order?: number,
  createdAt: Date,
  updatedAt: Date
}
```

### courseContents (unified)
```
{
  _id: ObjectId,
  courseId: ObjectId,
  contentType: "custom" | "scorm",
  customContentId?: ObjectId,
  scormPackageId?: ObjectId,
  title?: string,
  order?: number,
  required?: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### courseEnrollments
```
{
  _id: ObjectId,
  learnerId: ObjectId,
  courseId: ObjectId,
  status: "active" | "completed" | "withdrawn",
  progressPct?: number,
  enrolledAt: Date,
  completedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### customContents
```
{
  _id: ObjectId,
  title: string,
  customType: "exam" | "quiz" | "practice" | "other",
  gradingPolicy?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### scormPackages
```
{
  _id: ObjectId,
  title: string,
  status: "draft" | "published" | "archived",
  version?: string,
  createdAt: Date,
  updatedAt: Date
}
```

### contentAttempts (unified)
```
{
  _id: ObjectId,
  learnerId: ObjectId,
  courseContentId: ObjectId,
  contentType: "custom" | "scorm",
  status: "not_started" | "in_progress" | "completed" | "passed" | "failed",
  score?: number,
  startedAt?: Date,
  completedAt?: Date,
  scormData?: {
    cmi?: object,
    sessionLog?: Array<object>,
    runtime?: object
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Reference Map
- learners._id ← programEnrollments.learnerId
- programs._id ← programEnrollments.programId
- programs._id ← programLevels.programId
- programLevels._id ← classes.levelId
- programs._id ← classes.programId
- classes._id ← classEnrollments.classId
- learners._id ← classEnrollments.learnerId
- programs._id ← courses.programId
- programLevels._id ← courses.levelId
- courses._id ← courseContents.courseId
- courseContents._id ← contentAttempts.courseContentId
- learners._id ← contentAttempts.learnerId
- customContents._id ← courseContents.customContentId (contentType=custom)
- scormPackages._id ← courseContents.scormPackageId (contentType=scorm)

## Derived Metrics
- Program completion = aggregate CourseEnrollments for the program’s courses.
- Class progress = aggregate CourseEnrollments for the class’s ProgramLevel courses.
- Course completion = completion of required CourseContents (ContentAttempts).

## Index Recommendations
- programEnrollments: `{ learnerId: 1, programId: 1 }` unique
- classEnrollments: `{ learnerId: 1, classId: 1 }` unique
- courseEnrollments: `{ learnerId: 1, courseId: 1 }` unique
- courseContents: `{ courseId: 1, order: 1 }`
- contentAttempts: `{ learnerId: 1, courseContentId: 1 }`
