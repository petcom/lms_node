# Academic Assessments Contract

Base URL: `/api/v1`

## Auth
- Requires `Authorization: Bearer <token>`
- Roles: `staff` (create/update), `global-admin` (full access), learners for write/check endpoints.

## Exams
### Create
POST `/exams`

Body:
```
{
  "name": "Midterm",
  "description": "Program level midterm",
  "course": "course-id",
  "program": "program-id",
  "programLevel": "program-level-id",
  "academicYear": "academic-year-id",
  "academicTerm": "academic-term-id",
  "passMark": 50,
  "totalMark": 100,
  "duration": "45 minutes",
  "examDate": "2025-01-15T00:00:00.000Z",
  "examTime": "10:00",
  "examType": "quiz",
  "examStatus": "pending"
}
```

### List
GET `/exams?program=&programLevel=&course=&academicYear=&academicTerm=&examStatus=`

### Detail
GET `/exams/:id`

### Update
PUT `/exams/:id`

### Delete
DELETE `/exams/:id`

## Questions
### Create
POST `/questions`

Body:
```
{
  "question": "What is 2+2?",
  "optionA": "3",
  "optionB": "4",
  "optionC": "5",
  "optionD": "6",
  "correctAnswer": "B"
}
```

### List
GET `/questions`

### Detail
GET `/questions/:id`

### Update
PUT `/questions/:id`

### Delete
DELETE `/questions/:id`

## Exam Results
### List
GET `/exam-results?exam=&learner=&academicYear=&academicTerm=&programLevel=`

### Detail
GET `/exam-results/:id`

### Learner Results
GET `/exam-results/learner/:learnerId`

### Check Results
GET `/exam-results/check/:examId`

### Request Remark
POST `/exam-results/remark/:id`

Body:
```
{ "reason": "Please recheck question 3." }
```

## Learner Exam Submission
POST `/learners/exams/:examID/write`

Body:
```
{
  "answers": [
    { "questionId": "question-id", "answer": "B" }
  ]
}
```
