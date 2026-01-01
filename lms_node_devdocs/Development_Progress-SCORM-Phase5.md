# SCORM Phase 5: Tracking & Reporting - Development Progress

**Status**: 🚧 IN PROGRESS  
**Started**: December 19, 2025  
**Target Completion**: December 19, 2025

## Overview
Phase 5 implements comprehensive tracking and reporting features for SCORM content, including learner progress dashboards, instructor analytics, completion tracking, score aggregation, and data export functionality.

## Phase 5 Goals (from SCORM_Implementation_Plan.md)

### Deliverables:
- [ ] Learner progress dashboard endpoints
- [ ] Instructor analytics dashboard endpoints
- [ ] Completion tracking and calculations
- [ ] Score tracking and grading integration
- [ ] Time tracking and aggregation
- [ ] Export functionality (CSV, JSON, Excel)
- [ ] Report generation utilities
- [ ] Data visualization support

---

## Implementation Checklist

### Report Controller
- [ ] Create `controller/scorm/scormReportCtrl.ts`
  - [ ] `getLearnerProgress()` - Learner's SCORM progress across all packages
  - [ ] `getPackageAnalytics()` - Package-level analytics for instructors
  - [ ] `getAttemptDetails()` - Detailed attempt information
  - [ ] `exportTrackingData()` - Export data in various formats
  - [ ] `getCompletionRates()` - Completion statistics
  - [ ] `getScoreDistribution()` - Score distribution analysis
  - [ ] `getTimeAnalytics()` - Time spent analysis
  - [ ] `getInteractionData()` - Interaction tracking

### Report Routes
- [ ] Create `routes/scorm/scormReportRoutes.ts`
  - [ ] GET /learner/:learnerId - Learner progress
  - [ ] GET /package/:packageId/analytics - Package analytics
  - [ ] GET /attempts/:attemptId - Attempt details
  - [ ] GET /export - Export tracking data
  - [ ] GET /completion/:packageId - Completion rates
  - [ ] GET /scores/:packageId - Score distribution
  - [ ] GET /time/:packageId - Time analytics
  - [ ] GET /interactions/:attemptId - Interaction data

### Utility Functions
- [ ] Create `utils/scorm/completionCalculator.ts`
  - [ ] Calculate completion percentage
  - [ ] Determine pass/fail status
  - [ ] Calculate best score
  - [ ] Calculate total time spent
  - [ ] Calculate average score
  - [ ] Calculate completion rate

### Data Export
- [ ] Implement CSV export
- [ ] Implement JSON export
- [ ] Implement Excel (XLSX) export
- [ ] Add export filtering options
- [ ] Add date range filtering

### Integration
- [ ] Integrate with existing gradebook
- [ ] Update grade calculation to include SCORM scores
- [ ] Link SCORM completion to course requirements
- [ ] Add SCORM data to learner transcripts

### Testing
- [ ] Unit tests for report controller
- [ ] Unit tests for completion calculator
- [ ] Integration tests for report endpoints
- [ ] Test export functionality
- [ ] Test data aggregation accuracy

---

## API Endpoints Design

### 1. Learner Progress
```typescript
GET /api/v1/scorm/reports/learner/:learnerId

Response:
{
  success: true,
  data: {
    learnerId: ObjectId,
    learnerName: string,
    packages: [
      {
        packageId: ObjectId,
        title: string,
        version: string,
        attempts: [
          {
            attemptId: string,
            attemptNumber: number,
            startedAt: Date,
            completedAt: Date,
            status: string,
            score: number,
            timeSpent: number
          }
        ],
        bestScore: number,
        totalAttempts: number,
        completionStatus: string,
        totalTimeSpent: number,
        lastAccessed: Date
      }
    ],
    summary: {
      totalPackages: number,
      completedPackages: number,
      averageScore: number,
      totalTimeSpent: number
    }
  }
}
```

### 2. Package Analytics
```typescript
GET /api/v1/scorm/reports/package/:packageId/analytics

Query Params:
- startDate?: Date
- endDate?: Date
- classLevel?: ObjectId
- program?: ObjectId

Response:
{
  success: true,
  data: {
    packageId: ObjectId,
    packageTitle: string,
    dateRange: { start: Date, end: Date },
    summary: {
      totalLearners: number,
      learnersStarted: number,
      learnersCompleted: number,
      completionRate: number,
      averageScore: number,
      averageTimeSpent: number,
      passRate: number
    },
    learners: [
      {
        learnerId: ObjectId,
        learnerName: string,
        attempts: number,
        bestScore: number,
        averageScore: number,
        status: string,
        timeSpent: number,
        lastAccessed: Date,
        firstAccessed: Date
      }
    ],
    scoreDistribution: {
      bins: [0-10, 10-20, ..., 90-100],
      counts: [2, 5, 8, 15, 20, ...]
    },
    timeDistribution: {
      bins: [0-5min, 5-10min, ..., 60+min],
      counts: [3, 7, 12, ...]
    }
  }
}
```

### 3. Attempt Details
```typescript
GET /api/v1/scorm/reports/attempts/:attemptId

Response:
{
  success: true,
  data: {
    attemptId: string,
    learner: {
      id: ObjectId,
      name: string,
      email: string
    },
    package: {
      id: ObjectId,
      title: string,
      version: string
    },
    attemptNumber: number,
    startedAt: Date,
    lastAccessedAt: Date,
    completedAt: Date,
    status: string,
    cmi: {
      completion_status: string,
      success_status: string,
      score: { raw, min, max, scaled },
      session_time: string,
      total_time: string,
      location: string,
      suspend_data: string,
      interactions: [...],
      objectives: [...]
    },
    sessionLog: [
      {
        timestamp: Date,
        action: string,
        details: object
      }
    ]
  }
}
```

### 4. Export Data
```typescript
GET /api/v1/scorm/reports/export

Query Params:
- packageId?: ObjectId
- learnerId?: ObjectId
- startDate?: Date
- endDate?: Date
- format: 'json' | 'csv' | 'xlsx'
- includeInteractions?: boolean
- includeObjectives?: boolean

Response:
- Content-Type: application/json | text/csv | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
- Content-Disposition: attachment; filename="scorm-export-{date}.{ext}"
- Body: Formatted data
```

### 5. Completion Rates
```typescript
GET /api/v1/scorm/reports/completion/:packageId

Query Params:
- startDate?: Date
- endDate?: Date
- groupBy?: 'day' | 'week' | 'month'

Response:
{
  success: true,
  data: {
    packageId: ObjectId,
    packageTitle: string,
    overall: {
      totalLearners: number,
      completedLearners: number,
      completionRate: number
    },
    timeline: [
      {
        period: string,
        started: number,
        completed: number,
        completionRate: number
      }
    ]
  }
}
```

### 6. Score Distribution
```typescript
GET /api/v1/scorm/reports/scores/:packageId

Response:
{
  success: true,
  data: {
    packageId: ObjectId,
    packageTitle: string,
    statistics: {
      mean: number,
      median: number,
      mode: number,
      min: number,
      max: number,
      stdDev: number
    },
    distribution: [
      { range: '0-10', count: number, percentage: number },
      { range: '10-20', count: number, percentage: number },
      ...
    ],
    grades: [
      { grade: 'A', min: 90, max: 100, count: number },
      { grade: 'B', min: 80, max: 89, count: number },
      ...
    ]
  }
}
```

### 7. Time Analytics
```typescript
GET /api/v1/scorm/reports/time/:packageId

Response:
{
  success: true,
  data: {
    packageId: ObjectId,
    packageTitle: string,
    statistics: {
      averageTime: number,
      medianTime: number,
      minTime: number,
      maxTime: number
    },
    distribution: [
      { range: '0-5 min', count: number },
      { range: '5-10 min', count: number },
      ...
    ],
    timeByStatus: {
      completed: { average: number, total: number },
      incomplete: { average: number, total: number }
    }
  }
}
```

### 8. Interaction Data
```typescript
GET /api/v1/scorm/reports/interactions/:attemptId

Response:
{
  success: true,
  data: {
    attemptId: string,
    interactions: [
      {
        id: string,
        type: string,
        timestamp: Date,
        correctResponse: string,
        learnerResponse: string,
        result: string,
        latency: string,
        description: string
      }
    ],
    summary: {
      totalInteractions: number,
      correctInteractions: number,
      incorrectInteractions: number,
      successRate: number
    }
  }
}
```

---

## Completion Calculator Utility

### Functions to Implement

```typescript
// utils/scorm/completionCalculator.ts

export function calculateCompletionPercentage(attempt: IScormAttempt): number {
  // Based on completion_status, objectives completed, etc.
}

export function determinePassFailStatus(attempt: IScormAttempt, package: IScormPackage): string {
  // Based on success_status, score vs passing score
}

export function calculateBestScore(attempts: IScormAttempt[]): number {
  // Return highest score across all attempts
}

export function calculateTotalTimeSpent(attempts: IScormAttempt[]): number {
  // Sum of all session times
}

export function calculateAverageScore(attempts: IScormAttempt[]): number {
  // Average score across attempts
}

export function calculateCompletionRate(learners: any[], packageId: ObjectId): number {
  // Percentage of learners who completed the package
}

export function aggregateScoreDistribution(attempts: IScormAttempt[]): object {
  // Create histogram of scores
}

export function aggregateTimeDistribution(attempts: IScormAttempt[]): object {
  // Create histogram of time spent
}

export function parseScormTime(timeString: string): number {
  // Convert ISO 8601 duration to seconds
}

export function formatTimeForDisplay(seconds: number): string {
  // Convert seconds to readable format (e.g., "1h 30m 45s")
}
```

---

## Data Export Implementation

### CSV Export Format
```csv
Learner ID,Learner Name,Package ID,Package Title,Attempt Number,Started At,Completed At,Status,Score,Time Spent,Completion Status,Success Status
123,John Doe,abc,Course 101,1,2025-01-01 09:00,2025-01-01 10:30,completed,85,5400,completed,passed
123,John Doe,def,Course 102,1,2025-01-02 14:00,,incomplete,0,1200,incomplete,unknown
```

### JSON Export Format
```json
{
  "exportDate": "2025-12-19T10:00:00Z",
  "filters": {
    "packageId": "abc123",
    "startDate": "2025-01-01",
    "endDate": "2025-12-19"
  },
  "data": [
    {
      "learner": {
        "id": "123",
        "name": "John Doe"
      },
      "package": {
        "id": "abc",
        "title": "Course 101"
      },
      "attempts": [
        {
          "attemptNumber": 1,
          "startedAt": "2025-01-01T09:00:00Z",
          "completedAt": "2025-01-01T10:30:00Z",
          "status": "completed",
          "score": 85,
          "timeSpent": 5400,
          "completionStatus": "completed",
          "successStatus": "passed"
        }
      ]
    }
  ]
}
```

### Excel Export
- Use `exceljs` library
- Multiple sheets: Summary, Details, Interactions
- Formatted headers and cells
- Charts for score distribution

---

## Integration with Grading System

### Update Existing Models

#### ExamResult Extension
```typescript
// Add SCORM score integration
interface IExamResult {
  // ... existing fields
  scormAttempt?: mongoose.Types.ObjectId;  // Link to SCORM attempt
  isScormBased?: boolean;                   // Flag for SCORM-based assessment
}
```

#### Grade Calculation
```typescript
// Include SCORM scores in final grade calculation
async function calculateLearnerGrade(learnerId: ObjectId, subjectId: ObjectId) {
  // Get traditional exam results
  const examResults = await ExamResult.find({ learner: learnerId });
  
  // Get SCORM attempt results
  const scormResults = await ScormAttempt.find({ 
    learner: learnerId,
    status: 'completed'
  }).populate('package');
  
  // Calculate weighted average including SCORM scores
  // ...
}
```

---

## Progress Tracking

### Status**: 🚧 Starting implementation...

