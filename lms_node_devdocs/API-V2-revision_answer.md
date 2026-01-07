# API V2 Revision - UI Team Questions & Answers

> **Date:** 2025-01-06  
> **Status:** Pending Review  
> **Participants:** UI Team, API Team

---

## Section 1: Questions and Answers

### Q1: Email Resolution

**Question:** Will the API return email as a joined field from User, or must the UI make a separate call?

**Answer:** ✅ **The API returns email as a joined field from User.**

The controllers already implement this pattern:
- `learnersCtrl.ts` fetches User separately and merges email into the response
- `staffCtrl.ts` follows the same pattern via `getEmail()` method
- All profile and list endpoints include email in responses

**UI Impact:** No separate call needed. Email is included in all person-type responses.

**Implementation Status:** ✅ Complete

---

### Q2: Department Derivation

**Question:** Will Course API responses include department (derived from Program) for convenience, or must UI always traverse the Program relationship?

**Answer:** ⚠️ **Currently, Course responses do NOT include department by default.**

Courses use the `getDepartment()` async method which must be explicitly called. Current behavior:
- Course responses return `program` reference only
- Department must be accessed via `program.department` after population

**UI Impact:** UI must either:
1. Request program population and read `program.department`, OR
2. We add department as a convenience field (requires API change)

**Implementation Status:** 🔴 Needs Decision

**Recommendation:** Add `department` as convenience field in Course GET responses.

**Decision:** ✅ Add department as convenience field (see Section 2.1)

---

### Q3: Role Format

**Question:** Will the API return both role (legacy) and roles[] (V2) during migration, or switch completely?

**Answer:** ✅ **API returns ONLY `roles[]` and `primaryRole` (V2 format).**

DCV-001 fully migrated to the new format:
- `roles: string[]` - Array of roles
- `primaryRole: string` - Default role for dashboard routing
- `staffRoles: ObjectId[]` - Staff subrole references

**UI Impact:** 
- Use `primaryRole` for dashboard routing
- Use `roles` array for permission checks
- Legacy `role` field no longer exists

**Implementation Status:** ✅ Complete

---

### Q4: Batch Enrollment Maximum

**Question:** What is the maximum batch size for /program-enrollments/batch? Contract says 100.

**Answer:** ⚠️ **100 is the documented limit, but the endpoint is not fully implemented.**

The EVIP Phase 5 established the pattern using `insertMany()` and `bulkWrite()`, but the actual REST endpoints with validation are not yet built.

**UI Impact:** Batch endpoints are not available for use yet.

**Implementation Status:** 🔴 Needs Implementation

---

### Q5: Feature Flags

**Question:** How will the UI query for active feature flags? GET /settings with features map, or separate endpoint?

**Answer:** ✅ **Use `GET /settings` and read the `features` Map.**

```json
{
  "features": {
    "scormV2": true,
    "batchEnrollments": true,
    "multiDepartmentStaff": true,
    "credentialTracking": true
  }
}
```

**UI Impact:** 
- Requires authentication (global-admin only currently)
- Features are key-value pairs in the settings response

**Implementation Status:** ✅ Complete (Settings model has features Map per DCV-050)

**Open Question:** Should feature flags be public (no auth) for pre-login UI checks?

**Decision:** ✅ Use .env variables for feature flags, add to .env.example, enable all by default (see Section 2.1)

---

### Q6: Credential Workflow

**Question:** What UI views are needed for credential management? Admin-only, or learner can view their credentials?

**Answer:** ⚠️ **Model exists, but endpoints are partially implemented.**

Current state:
- ✅ Credential model defined (DCV-031)
- ✅ Admin CRUD on credential definitions
- 🔴 Learner view of earned credentials (needs endpoint)
- 🔴 Credential awarding workflow (needs endpoint)
- 🔴 Progress tracking toward credentials (needs implementation)

**UI Impact:** Admin credential management is ready. Learner-facing features need API work.

**Implementation Status:** 🔴 Partially Complete

**Decision:** ✅ Separate implementation - Full credential system with 5-year retention, segment scores, completion tracking, and PDF storage. Not included in V2 changes. (see Section 2.3)

---

### Q7: CourseEnrollmentCurrent/Activity Split

**Question:** When should UI use Current vs Activity endpoints? Is there a unified view?

**Answer:** ✅ **Use Current for active courses, Activity for completed/withdrawn history.**

| Model | Purpose | UI View |
|-------|---------|---------|
| `CourseEnrollmentCurrent` | Active course progress | "My Courses" dashboard |
| `CourseEnrollmentActivity` | Historical records | Transcript, course history |

**Transition:** When a course is completed or withdrawn, the record moves from Current → Activity.

**UI Impact:** 
- Dashboard shows Current enrollments
- Transcript/history shows Activity records
- No unified endpoint exists yet

**Implementation Status:** 🟡 Models Complete, Unified Endpoint Missing

**Decision:** ✅ Create unified endpoint combining Current + Activity (see Section 2.1)

---

## Section 2: Follow-Up Items

### 2.1 Decisions Made

| # | Item | Decision | Owner | Status |
|---|------|----------|-------|--------|
| D1 | Department convenience field in Course responses | ✅ **Add department as convenience field** - Derived from Program | API Team | To Implement |
| D2 | Feature flags access for UI | ✅ **Use .env variables** - Create .env item specifying feature flags, add to .env.example, enable all by default | API Team | To Implement |
| D3 | Credential management scope | ✅ **Separate implementation** - Full credential system (5-year retention, segment scores, completion status, PDF storage). Do NOT include in V2 changes. | Product | Future Sprint |
| D4 | Unified course history endpoint | ✅ **Create unified endpoint** - Combine Current + Activity for learner transcript view | API Team | To Implement |

### 2.2 Implementation Tasks for V2

| # | Task | Priority | Status |
|---|------|----------|--------|
| T1 | Implement batch enrollment endpoints | High | Not Started |
| T2 | Add department convenience field to Course responses | Medium | Not Started |
| T3 | Create unified course history endpoint | Medium | Not Started |
| T4 | Add feature flags to .env and .env.example | Low | Not Started |

### 2.3 Deferred to Separate Implementation

| # | Item | Reason |
|---|------|--------|
| C1 | Credential management system | Full feature requiring separate design |
| C2 | Learner credential view endpoints | Part of credential system |
| C3 | Credential awarding workflow | Part of credential system |
| C4 | Credential PDF storage | Part of credential system |

**Credential System Requirements (Future):**
- 5-year credential retention
- Store scores for all course segments
- Track completion status for all course segments
- Store PDF of credential achieved
- Learner view of earned credentials
- Progress tracking toward available credentials

### 2.4 Documentation Updates Needed

| Document | Update Required |
|----------|-----------------|
| `Enrollment-api-contract.md` | Add batch endpoint documentation when implemented |
| `Academic-api-contract.md` | Document department convenience field in Course responses |
| `Enrollment-api-contract.md` | Document unified course history endpoint |
| `.env.example` | Add feature flag environment variables |
| `API_Index.md` | Update endpoint tables with new endpoints |

### 2.5 Resolved Questions

1. **Credential Scope:** ✅ Separate implementation planned for full credential system
2. **Course History:** ✅ Yes - Create unified endpoint combining Current + Activity
3. **Feature Flags:** ✅ Not needed at UI pre-login - Use .env variables instead

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-01-06 | API Team | Initial Q&A document |
