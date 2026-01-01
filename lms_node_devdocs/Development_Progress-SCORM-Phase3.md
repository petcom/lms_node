# SCORM Phase 3: SCORM Runtime API - Development Progress

**Status**: 🚧 In Progress  
**Started**: Current Session  
**Target Completion**: Current Session

## Overview
Phase 3 implements the SCORM Runtime API that enables communication between SCORM content (running in an iframe) and the LMS. This is the core of SCORM functionality, handling:
- API initialization and session management
- CMI data exchange (GetValue/SetValue)
- Progress commit and persistence
- Session termination and cleanup

## Phase 3 Goals (from SCORM_Implementation_Plan.md)

### Deliverables:
- [ ] SCORM API adapter (client-side JavaScript)
- [ ] Runtime API endpoints (Initialize, GetValue, SetValue, Commit, Terminate)
- [ ] CMI data management
- [ ] Attempt tracking
- [ ] Session management

### Tasks:
1. [ ] Create `public/scorm/scorm-api-adapter.js` (SCORM 1.2)
2. [ ] Create `public/scorm/scorm-api-2004.js` (SCORM 2004)
3. [ ] Create `controller/scorm/scormRuntimeCtrl.ts`
4. [ ] Create `routes/scorm/scormRuntimeRoutes.ts`
5. [ ] Implement Initialize endpoint
6. [ ] Implement GetValue/SetValue endpoints
7. [ ] Implement Commit endpoint
8. [ ] Implement Terminate endpoint
9. [ ] Create `utils/scorm/cmiDataMapper.ts`
10. [ ] Handle CMI data validation
11. [ ] Implement session timeout handling
12. [ ] Write unit and integration tests

---

## SCORM Runtime API Overview

### SCORM 1.2 API Methods (window.API)
```javascript
// Required methods:
LMSInitialize("")           // Start a session
LMSFinish("")              // End a session
LMSGetValue(element)       // Get CMI data
LMSSetValue(element, value) // Set CMI data
LMSCommit("")              // Persist data
LMSGetLastError()          // Get last error code
LMSGetErrorString(code)    // Get error description
LMSGetDiagnostic(code)     // Get detailed diagnostic
```

### SCORM 2004 API Methods (window.API_1484_11)
```javascript
// Required methods:
Initialize("")             // Start a session
Terminate("")             // End a session
GetValue(element)         // Get CMI data
SetValue(element, value)  // Set CMI data
Commit("")                // Persist data
GetLastError()            // Get last error code
GetErrorString(code)      // Get error description
GetDiagnostic(code)       // Get detailed diagnostic
```

### Key CMI Elements (SCORM 1.2)
- `cmi.core.learner_id`
- `cmi.core.learner_name`
- `cmi.core.lesson_status` (passed, completed, failed, incomplete, browsed, not attempted)
- `cmi.core.score.raw` (0-100)
- `cmi.core.score.min`
- `cmi.core.score.max`
- `cmi.core.session_time` (HH:MM:SS)
- `cmi.core.total_time` (HH:MM:SS)
- `cmi.suspend_data` (resume data, max 4096 chars)
- `cmi.launch_data`
- `cmi.comments`
- `cmi.interactions.*` (interactions tracking)

### Key CMI Elements (SCORM 2004)
- `cmi.learner_id`
- `cmi.learner_name`
- `cmi.completion_status` (completed, incomplete, not attempted, unknown)
- `cmi.success_status` (passed, failed, unknown)
- `cmi.score.raw`
- `cmi.score.min`
- `cmi.score.max`
- `cmi.score.scaled` (-1 to 1)
- `cmi.session_time` (ISO 8601 duration)
- `cmi.total_time` (ISO 8601 duration)
- `cmi.suspend_data` (max 64000 chars)
- `cmi.launch_data`
- `cmi.interactions.*`

---

## Implementation Plan

### Step 1: Server-side Runtime Controller ✅ (from Phase 2)
**Status**: ✅ Partially complete - CMI update/get endpoints exist in scormAttemptCtrl.ts

**Existing Endpoints:**
- `PUT /api/v1/scorm/attempts/:attemptId/cmi` - Update CMI data
- `GET /api/v1/scorm/attempts/:attemptId/cmi/:element` - Get CMI element

**Need to Add:**
- Initialize session endpoint
- Commit endpoint
- Terminate endpoint
- Error handling endpoints
- Session timeout management

### Step 2: Client-side SCORM API Adapters
**Status**: ⏸️ Pending

**Files to Create:**
- `public/scorm/scorm-api-1.2.js` - SCORM 1.2 API wrapper
- `public/scorm/scorm-api-2004.js` - SCORM 2004 API wrapper
- Both expose window.API or window.API_1484_11
- Communicate with server via fetch/axios
- Handle errors and return proper SCORM error codes

### Step 3: CMI Data Mapper Utility
**Status**: ⏸️ Pending

**File**: `utils/scorm/cmiDataMapper.ts`

**Responsibilities:**
- Validate CMI element paths
- Map SCORM 1.2 ↔ database structure
- Map SCORM 2004 ↔ database structure
- Handle data type conversions
- Handle time format conversions (SCORM time → seconds)
- Handle score normalization

### Step 4: Session Management
**Status**: ⏸️ Pending

**Requirements:**
- Track active sessions per attempt
- Session timeout (configurable, e.g., 30 minutes)
- Auto-commit on timeout
- Heartbeat mechanism
- Handle concurrent sessions (prevent multiple tabs)

### Step 5: Integration with Player
**Status**: ⏸️ Pending (Phase 4)

**Integration Points:**
- Player HTML must inject SCORM API into iframe parent
- API must be available before content loads
- Content searches for API via findAPI() pattern
- API must be cleaned up on content unload

---

## Technical Decisions

### 1. API Communication Strategy
**Decision**: RESTful HTTP endpoints  
**Rationale**: Consistent with existing LMS API, easier to debug, works with CORS  
**Alternative**: WebSocket (more complex, may be overkill)

### 2. Session Storage
**Decision**: Server-side session in MongoDB (ScormAttempt document)  
**Rationale**: Persistent, survives page refresh, supports resume  
**Alternative**: Redis session (faster but requires Redis setup)

### 3. CMI Data Storage
**Decision**: Nested object in ScormAttempt.cmi field  
**Rationale**: MongoDB handles nested objects well, schema already defined  
**Alternative**: Separate ScormCMI collection (more normalized but slower)

### 4. Error Handling
**Decision**: Return SCORM-compliant error codes  
**Rationale**: SCORM spec requires specific error codes  
**Codes**:
- SCORM 1.2: 0 (no error), 101 (general exception), 201 (invalid argument), 301 (not initialized), etc.
- SCORM 2004: 0 (no error), 101 (general exception), 201 (invalid argument), 301 (not initialized), etc.

### 5. Time Format Handling
**Decision**: Store as seconds in DB, convert to/from SCORM format in mapper  
**Rationale**: Easier to aggregate and calculate  
**SCORM 1.2**: HH:MM:SS.SS format  
**SCORM 2004**: ISO 8601 duration (PT1H30M45S)

---

## Implementation Checklist

### Server-side (TypeScript/Express)

#### Controllers
- [ ] Enhance `scormAttemptCtrl.ts` with runtime methods:
  - [ ] `initializeSession` - POST /api/v1/scorm/runtime/:attemptId/initialize
  - [ ] `commitSession` - POST /api/v1/scorm/runtime/:attemptId/commit
  - [ ] `terminateSession` - POST /api/v1/scorm/runtime/:attemptId/terminate
  - [ ] `getLastError` - GET /api/v1/scorm/runtime/:attemptId/error
  - [ ] `heartbeat` - POST /api/v1/scorm/runtime/:attemptId/heartbeat

Or create new:
- [ ] Create `controller/scorm/scormRuntimeCtrl.ts` with all runtime methods

#### Routes
- [ ] Create `routes/scorm/scormRuntimeRoutes.ts`
  - [ ] POST /initialize
  - [ ] POST /commit
  - [ ] POST /terminate
  - [ ] GET /error
  - [ ] POST /heartbeat
  - [ ] GET /value/:element (or reuse from attempts)
  - [ ] PUT /value/:element (or reuse from attempts)

#### Utilities
- [ ] Create `utils/scorm/cmiDataMapper.ts`
  - [ ] `validateCMIElement(element, version)` - Validate element path
  - [ ] `getCMIValue(cmiData, element, version)` - Extract value from nested CMI
  - [ ] `setCMIValue(cmiData, element, value, version)` - Set value in nested CMI
  - [ ] `scormTimeToSeconds(timeString, version)` - Parse SCORM time
  - [ ] `secondsToScormTime(seconds, version)` - Format SCORM time
  - [ ] `normalizeScore(score, version)` - Normalize score (0-100 or -1 to 1)
  - [ ] `getErrorString(errorCode, version)` - Get SCORM error message
  - [ ] `mapCMIToDatabase(cmiData, version)` - Prepare for DB storage
  - [ ] `mapDatabaseToCMI(dbData, version)` - Prepare for SCORM content

- [ ] Create `utils/scorm/sessionManager.ts`
  - [ ] `createSession(attemptId, userId)` - Initialize session
  - [ ] `getSession(attemptId)` - Get active session
  - [ ] `updateHeartbeat(attemptId)` - Update last activity
  - [ ] `checkTimeout(attemptId)` - Check if session timed out
  - [ ] `terminateSession(attemptId)` - Clean up session
  - [ ] `autoCommitStale()` - Background job to commit stale sessions

### Client-side (JavaScript)

#### SCORM 1.2 API
- [ ] Create `public/scorm/scorm-api-1.2.js`
  - [ ] `window.API` object
  - [ ] `LMSInitialize(param)` - Call server initialize
  - [ ] `LMSFinish(param)` - Call server terminate
  - [ ] `LMSGetValue(element)` - Fetch CMI value
  - [ ] `LMSSetValue(element, value)` - Update CMI value (cache locally)
  - [ ] `LMSCommit(param)` - POST cached changes to server
  - [ ] `LMSGetLastError()` - Return last error code
  - [ ] `LMSGetErrorString(code)` - Return error description
  - [ ] `LMSGetDiagnostic(code)` - Return diagnostic info
  - [ ] Local error state management
  - [ ] Local CMI data cache
  - [ ] Debounced commit on SetValue

#### SCORM 2004 API
- [ ] Create `public/scorm/scorm-api-2004.js`
  - [ ] `window.API_1484_11` object
  - [ ] `Initialize(param)` - Call server initialize
  - [ ] `Terminate(param)` - Call server terminate
  - [ ] `GetValue(element)` - Fetch CMI value
  - [ ] `SetValue(element, value)` - Update CMI value (cache locally)
  - [ ] `Commit(param)` - POST cached changes to server
  - [ ] `GetLastError()` - Return last error code
  - [ ] `GetErrorString(code)` - Return error description
  - [ ] `GetDiagnostic(code)` - Return diagnostic info
  - [ ] Local error state management
  - [ ] Local CMI data cache
  - [ ] Debounced commit on SetValue

#### API Discovery Helper
- [ ] Create `public/scorm/scorm-api-finder.js`
  - [ ] `findAPI()` - Search window hierarchy for API
  - [ ] Works for both SCORM 1.2 and 2004
  - [ ] Searches parent windows up to 7 levels (SCORM spec)

### App Integration
- [ ] Register runtime routes in `app/app.ts`
- [ ] Serve static SCORM API files from `public/scorm/`

### Testing
- [ ] Unit tests for cmiDataMapper
- [ ] Unit tests for sessionManager
- [ ] Integration tests for runtime endpoints
- [ ] E2E tests with sample SCORM content
- [ ] Test session timeout behavior
- [ ] Test concurrent session prevention
- [ ] Test data persistence across Initialize/Terminate

### Documentation
- [ ] API endpoint documentation (Swagger)
- [ ] SCORM API usage guide
- [ ] Error code reference
- [ ] Session management guide

---

## Data Flow Example

### Scenario: Learner launches SCORM content and completes it

1. **Learner clicks "Launch" on package**
   - Frontend: POST /api/v1/scorm/content/:packageId/launch
   - Backend: Creates ScormAttempt if new, returns launch URL
   
2. **Player loads with SCORM API**
   - Player HTML loads SCORM API script in parent frame
   - API script exposes window.API or window.API_1484_11
   
3. **SCORM content loads in iframe**
   - Content executes `findAPI()` to locate API
   - Content calls `API.LMSInitialize("")`
   
4. **LMSInitialize**
   - Client API: POST /api/v1/scorm/runtime/:attemptId/initialize
   - Server: Creates session, sets attempt status to "running"
   - Returns: "true"
   
5. **Content sets learner name**
   - Content calls `API.LMSGetValue("cmi.core.learner_name")`
   - Client API: GET /api/v1/scorm/runtime/:attemptId/value/cmi.core.learner_name
   - Server: Returns learner name from attempt
   - Returns: "John Doe"
   
6. **Content tracks progress**
   - Content calls `API.LMSSetValue("cmi.core.lesson_status", "incomplete")`
   - Client API: Caches value locally
   - Content calls `API.LMSSetValue("cmi.core.score.raw", "75")`
   - Client API: Caches value locally
   
7. **Content commits data**
   - Content calls `API.LMSCommit("")`
   - Client API: POST /api/v1/scorm/runtime/:attemptId/commit
   - Body: `{ "cmi.core.lesson_status": "incomplete", "cmi.core.score.raw": "75" }`
   - Server: Uses cmiDataMapper to validate and store
   - Returns: "true"
   
8. **Learner completes content**
   - Content calls `API.LMSSetValue("cmi.core.lesson_status", "completed")`
   - Content calls `API.LMSSetValue("cmi.core.score.raw", "95")`
   - Content calls `API.LMSCommit("")`
   - Content calls `API.LMSFinish("")`
   
9. **LMSFinish**
   - Client API: POST /api/v1/scorm/runtime/:attemptId/terminate
   - Server: Commits any pending data, sets attempt status to "completed"
   - Server: Calculates final score, updates package statistics
   - Returns: "true"
   
10. **Player closes**
    - Frontend redirects to completion page or course list

---

## Error Handling Strategy

### SCORM 1.2 Error Codes
- `0` - No error
- `101` - General exception
- `201` - Invalid argument error
- `202` - Element cannot have children
- `203` - Element not an array
- `301` - Not initialized
- `401` - Not implemented error
- `402` - Invalid set value, element is a keyword
- `403` - Element is read only
- `404` - Element is write only
- `405` - Incorrect data type

### SCORM 2004 Error Codes  
- `0` - No error
- `101` - General exception
- `102` - General initialization failure
- `103` - Already initialized
- `104` - Content instance terminated
- `111` - General termination failure
- `112` - Termination before initialization
- `122` - Retrieve data before initialization
- `123` - Store data before initialization
- `132` - Commit before initialization
- `133` - Argument error
- `142` - Retrieve data before initialization
- `143` - Store data before initialization
- `201` - General argument error
- `301` - General get failure
- `351` - General set failure
- `391` - General commit failure
- `401` - Undefined data model element
- `402` - Unimplemented data model element
- `403` - Data model element value not initialized
- `404` - Data model element is read only
- `405` - Data model element is write only
- `406` - Data model element type mismatch
- `407` - Data model element value out of range
- `408` - Data model dependency not established

### Server-side Error Mapping
```typescript
const SCORM_ERRORS = {
  '1.2': {
    0: 'No error',
    101: 'General exception',
    201: 'Invalid argument error',
    301: 'Not initialized',
    // ... full mapping
  },
  '2004': {
    0: 'No error',
    101: 'General exception',
    201: 'General argument error',
    301: 'General get failure',
    // ... full mapping
  }
};
```

---

## Session Management Strategy

### Session Lifecycle
1. **Create**: On LMSInitialize/Initialize
2. **Active**: While learner interacts with content
3. **Heartbeat**: Periodic ping to keep session alive
4. **Timeout**: After N minutes of inactivity
5. **Terminate**: On LMSFinish/Terminate or timeout

### Session Data Structure
```typescript
interface ScormSession {
  attemptId: string;
  userId: string;
  startedAt: Date;
  lastActivity: Date;
  status: 'active' | 'terminated' | 'timeout';
  pendingCMI: Record<string, any>; // Uncommitted changes
  errorCode: string;
  errorMessage?: string;
}
```

### Timeout Handling
- **Timeout Duration**: 30 minutes (configurable)
- **Check Frequency**: Every 5 minutes (background job)
- **On Timeout**:
  - Auto-commit any pending CMI data
  - Set attempt status to "suspended"
  - Log timeout event
  - Send notification to learner (optional)

### Heartbeat Mechanism
- **Frequency**: Every 2 minutes from client
- **Endpoint**: POST /api/v1/scorm/runtime/:attemptId/heartbeat
- **Response**: Session status, time remaining
- **Client**: JavaScript interval in SCORM API

---

## Progress Log

### Session 1 - Planning
**Status**: Planning complete  
**Next**: Begin implementation

---

**Last Updated**: Current Session
