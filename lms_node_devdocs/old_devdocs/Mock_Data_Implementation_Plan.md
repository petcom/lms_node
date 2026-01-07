# Mock Data Implementation Plan

**Created:** January 5, 2026  
**Status:** Planning  
**Purpose:** Create seed data for integration testing of Programs, Courses, Enrollments, and Analytics APIs

---

## Overview

Create a comprehensive set of mock data that can be loaded and purged via npm scripts. All mock records will use ObjectIds in a reserved range (`-10000` to `-9000` hex suffix) for easy identification and cleanup.

---

## ObjectId Strategy

All mock ObjectIds will follow a predictable pattern for easy identification:

```
Format: 000000000000000000XX####
Where:
  XX = Entity type code (see below)
  #### = Sequential number (0001-9999)

Entity Type Codes:
  d0 = Departments
  s0 = Staff
  u0 = Users (Auth)
  l0 = Learners
  p0 = Programs
  pl = ProgramLevels
  c0 = Courses
  cc = CourseContent (segments)
  cu = CustomContent
  pe = ProgramEnrollments
  rc = RenderedCourse
  lp = LearnerProgress
  ca = ContentAttempts
  q0 = Questions
```

---

## Data Structure

### 1. Departments (3)

| ID Suffix | Name | Code | Level |
|-----------|------|------|-------|
| `d00001` | Mock Experiential Therapy Dept | MET | sub |
| `d00002` | Mock Cognitive Sciences Dept | MCS | sub |
| `d00003` | Mock Trauma Recovery Dept | MTR | sub |

---

### 2. Staff & Users (4 new + existing Ada)

**Existing Global Admin (do not create):**
- Ada Lovelace (`ada@example.com`) - global-admin

**New Staff Members:**

| ID Suffix | Name | Email | Roles | Departments |
|-----------|------|-------|-------|-------------|
| `s00001` | Mock William Walton | mock.william@example.com | instructor | MET, MCS (admin for MET only) |
| `s00002` | Mock Jane Eyre | mock.jane@example.com | instructor | MCS |
| `s00003` | Mock Charles Darwin | mock.charles@example.com | instructor | MTR, MET |
| `s00004` | Mock Florence Nightingale | mock.florence@example.com | content-admin, billing-admin | MCS |

**Department Memberships Detail:**

| Staff | Dept 1 | Roles in Dept 1 | Dept 2 | Roles in Dept 2 |
|-------|--------|-----------------|--------|-----------------|
| William Walton | MET | instructor, department-admin | MCS | instructor |
| Jane Eyre | MCS | instructor | — | — |
| Charles Darwin | MTR | instructor | MET | instructor |
| Florence Nightingale | MCS | content-admin, billing-admin | — | — |

---

### 3. Learners (5)

| ID Suffix | Name | Email | Primary Dept |
|-----------|------|-------|--------------|
| `l00001` | Mock Johnny Appleseed | mock.johnny@learner.com | MET |
| `l00002` | Mock Emily Bronte | mock.emily@learner.com | MCS |
| `l00003` | Mock Oscar Wilde | mock.oscar@learner.com | MTR |
| `l00004` | Mock Virginia Woolf | mock.virginia@learner.com | MET |
| `l00005` | Mock Ernest Hemingway | mock.ernest@learner.com | MCS |

---

### 4. Programs (5)

| ID Suffix | Name | Department | Duration | Description |
|-----------|------|------------|----------|-------------|
| `p00001` | Mock Experiential Therapy Fundamentals | MET | 6 months | Core experiential therapy techniques |
| `p00002` | Mock Cognitive Behavioral Therapy | MCS | 8 months | CBT principles and practice |
| `p00003` | Mock EMDR Certification | MTR | 4 months | Eye Movement Desensitization training |
| `p00004` | Mock Somatic Therapy Practice | MET | 6 months | Body-based therapeutic approaches |
| `p00005` | Mock Dialectical Behavior Therapy | MCS | 10 months | DBT skills and techniques |

---

### 5. Program Levels (2-3 per program = 13 total)

| Program | Levels |
|---------|--------|
| Experiential Therapy Fundamentals | Level 1: Foundations, Level 2: Advanced Techniques |
| Cognitive Behavioral Therapy | Level 1: Basics, Level 2: Cognitive Restructuring, Level 3: Behavioral Activation |
| EMDR Certification | Level 1: Protocol Training, Level 2: Clinical Application |
| Somatic Therapy Practice | Level 1: Body Awareness, Level 2: Movement Integration, Level 3: Trauma Release |
| Dialectical Behavior Therapy | Level 1: Mindfulness Core, Level 2: Distress Tolerance |

**ProgramLevel IDs:** `pl0001` through `pl0013`

---

### 6. Courses (5 per program = 25 total)

Each program will have 5 courses distributed across its levels:
- **1 course** in `draft` status (no RenderedCourse)
- **4 courses** in `published` status (with RenderedCourse)

**Naming Pattern:** `Mock {Topic} {Level}`

**Sample for Experiential Therapy Fundamentals:**

| ID | Title | Level | Status | Primary Instructor | Secondary |
|----|-------|-------|--------|-------------------|-----------|
| `c00001` | Mock Attunement Basics | Level 1 | published | William Walton | Charles Darwin |
| `c00002` | Mock Emotional Regulation 101 | Level 1 | published | William Walton | — |
| `c00003` | Mock Body-Mind Connection | Level 2 | published | Charles Darwin | William Walton |
| `c00004` | Mock Advanced Attunement | Level 2 | published | William Walton | — |
| `c00005` | Mock Integration Techniques | Level 2 | draft | Charles Darwin | — |

*(Similar pattern for all 5 programs = 25 courses total)*

**Course IDs:** `c00001` through `c00025`

---

### 7. Course Content / Segments (2-3 per course = ~60 total)

Each course has 2-3 segments with mixed `customType`:

| customType | Distribution | Has Questions |
|------------|--------------|---------------|
| quiz | 30% | Yes (2-3) |
| exam | 20% | Yes (2-3) |
| exercise | 25% | No |
| custom | 25% | No |

**CourseContent IDs:** `cc0001` through `cc0065`  
**CustomContent IDs:** `cu0001` through `cu0065`

---

### 8. Questions (for quizzes/exams)

Each quiz/exam segment will have 2-3 questions.

**Question Types:** multiple-choice, true-false, short-answer

**Sample Questions:**
```json
{
  "title": "What is the primary goal of attunement?",
  "type": "multiple-choice",
  "options": ["Connection", "Correction", "Confrontation", "Comparison"],
  "correctAnswer": 0
}
```

**Question IDs:** `q00001` through `q00080` (estimated)

---

### 9. Program Enrollments (8 total)

| Learner | Program 1 | Status | Program 2 | Status |
|---------|-----------|--------|-----------|--------|
| Johnny Appleseed | Experiential Therapy (MET) | active | Cognitive Behavioral (MCS) | active |
| Emily Bronte | Cognitive Behavioral (MCS) | active | EMDR Certification (MTR) | active |
| Oscar Wilde | EMDR Certification (MTR) | active | Somatic Therapy (MET) | suspended |
| Virginia Woolf | Somatic Therapy (MET) | active | — | — |
| Ernest Hemingway | Dialectical Behavior (MCS) | active | — | — |

**Multi-department learners:** Johnny (MET+MCS), Emily (MCS+MTR), Oscar (MTR+MET)

**ProgramEnrollment IDs:** `pe0001` through `pe0008`

---

### 10. Rendered Courses (20 total)

All `published` courses (4 per program × 5 programs = 20) will have a RenderedCourse record.

**RenderedCourse IDs:** `rc0001` through `rc0020`

---

### 11. Learner Progress (15-20 records)

Track progress for enrolled learners on their program courses.

| Learner | Course | Status | Progress % |
|---------|--------|--------|------------|
| Johnny Appleseed | Attunement Basics | completed | 100 |
| Johnny Appleseed | Emotional Regulation 101 | in_progress | 60 |
| Emily Bronte | CBT Foundations | completed | 100 |
| Oscar Wilde | EMDR Protocol Basics | in_progress | 40 |
| ... | ... | ... | ... |

**LearnerProgress IDs:** `lp0001` through `lp0020`

---

### 12. Content Attempts (25-30 records)

Track individual segment attempts for learners.

| Learner | CourseContent | Status | Score | Time Spent |
|---------|---------------|--------|-------|------------|
| Johnny Appleseed | Quiz: Attunement Basics | completed | 85 | 1200s |
| Johnny Appleseed | Exercise: Body Scan | completed | — | 900s |
| Emily Bronte | Exam: CBT Principles | in_progress | — | 600s |
| ... | ... | ... | ... | ... |

**ContentAttempt IDs:** `ca0001` through `ca0030`

---

## Data Relationships Diagram

```
Departments (3)
├── MET: Mock Experiential Therapy Dept
│   ├── Staff: William Walton (admin+instructor), Charles Darwin (instructor)
│   ├── Learners: Johnny, Virginia
│   └── Programs: Experiential Therapy, Somatic Therapy
│       └── Courses (5 each) → CourseContent → CustomContent
│
├── MCS: Mock Cognitive Sciences Dept
│   ├── Staff: William Walton (instructor), Jane Eyre (instructor), Florence Nightingale (content+billing)
│   ├── Learners: Emily, Ernest
│   └── Programs: CBT, DBT
│       └── Courses (5 each) → CourseContent → CustomContent
│
└── MTR: Mock Trauma Recovery Dept
    ├── Staff: Charles Darwin (instructor)
    ├── Learners: Oscar
    └── Programs: EMDR
        └── Courses (5) → CourseContent → CustomContent

Enrollments:
├── Johnny → Experiential Therapy (MET), CBT (MCS)
├── Emily → CBT (MCS), EMDR (MTR)
├── Oscar → EMDR (MTR:active), Somatic (MET:suspended)
├── Virginia → Somatic (MET)
└── Ernest → DBT (MCS)

Analytics:
├── LearnerProgress → tracks course-level progress
└── ContentAttempts → tracks segment-level attempts
```

---

## Scripts

### File Structure
```
scripts/
├── seed-mock-data.ts       # Load script
├── purge-mock-data.ts      # Purge script
└── mock-data/
    ├── departments.ts
    ├── staff.ts
    ├── learners.ts
    ├── programs.ts
    ├── program-levels.ts
    ├── courses.ts
    ├── course-content.ts
    ├── custom-content.ts
    ├── questions.ts
    ├── enrollments.ts
    ├── rendered-courses.ts
    ├── learner-progress.ts
    ├── content-attempts.ts
    └── index.ts            # Aggregates all data
```

### NPM Scripts
```json
{
  "scripts": {
    "seed:mongomock": "ts-node scripts/seed-mock-data.ts",
    "seed:mongopurge": "ts-node scripts/purge-mock-data.ts"
  }
}
```

### Seed Script Logic
```typescript
// seed-mock-data.ts
1. Connect to MongoDB
2. Check for existing mock data (by ID range)
3. If exists, prompt or skip
4. Insert in dependency order:
   - Departments
   - Users + Staff
   - Learners
   - Programs
   - ProgramLevels
   - CustomContent + Questions
   - Courses
   - CourseContent
   - RenderedCourses
   - ProgramEnrollments
   - LearnerProgress
   - ContentAttempts
5. Log summary
6. Disconnect
```

### Purge Script Logic
```typescript
// purge-mock-data.ts
1. Connect to MongoDB
2. Delete by ID pattern (all IDs matching mock range)
3. Order: reverse of insert (attempts → progress → enrollments → ... → departments)
4. Log deletion counts
5. Disconnect
```

---

## Record Counts Summary

| Entity | Count |
|--------|-------|
| Departments | 3 |
| Users (Auth) | 4 |
| Staff | 4 |
| Learners | 5 |
| Programs | 5 |
| ProgramLevels | 13 |
| Courses | 25 |
| CourseContent | ~65 |
| CustomContent | ~65 |
| Questions | ~80 |
| ProgramEnrollments | 8 |
| RenderedCourses | 20 |
| LearnerProgress | ~20 |
| ContentAttempts | ~30 |
| **Total Records** | **~340** |

---

## ObjectId Mapping Reference

```typescript
// Helper to generate mock ObjectIds
const mockId = (prefix: string, num: number): mongoose.Types.ObjectId => {
  const hex = `000000000000${prefix}${num.toString().padStart(4, '0')}`;
  return new mongoose.Types.ObjectId(hex);
};

// Examples:
mockId('d0', 1)  // 0000000000000000d00001 - Department 1
mockId('s0', 1)  // 0000000000000000s00001 - Staff 1
mockId('c0', 25) // 0000000000000000c00025 - Course 25
```

---

## Verification Queries

After seeding, verify with:

```javascript
// Count mock departments
db.departments.countDocuments({ _id: /^0{16}d0/ })

// List mock programs with levels
db.programs.aggregate([
  { $match: { _id: /^0{16}p0/ } },
  { $lookup: { from: 'programlevels', localField: '_id', foreignField: 'program', as: 'levels' } }
])

// Check multi-department staff
db.staff.find({ 'departmentMemberships.1': { $exists: true }, _id: /^0{16}s0/ })
```

---

## Implementation Phases

1. **Phase 1:** Create data definition files in `scripts/mock-data/`
2. **Phase 2:** Create `seed-mock-data.ts` with insert logic
3. **Phase 3:** Create `purge-mock-data.ts` with cleanup logic
4. **Phase 4:** Add npm scripts to `package.json`
5. **Phase 5:** Test load/purge cycle
6. **Phase 6:** Verify API endpoints work with mock data

---

## Approval Checklist

- [ ] Department structure approved
- [ ] Staff roles and assignments approved
- [ ] Learner enrollments approved
- [ ] Course content mix approved
- [ ] ObjectId strategy approved
- [ ] Script naming approved

---

**Ready to implement?** Confirm the plan looks correct and I'll proceed with creating the scripts.
