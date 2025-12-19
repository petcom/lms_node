# SCORM Implementation Plan for LMS Node

## Executive Summary

This document outlines the implementation plan for adding SCORM (Sharable Content Object Reference Model) 1.2 and 2004 4th Edition compatibility to the LMS Node TypeScript application. SCORM enables standardized e-learning content delivery, tracking, and reporting.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Database Schema Changes](#database-schema-changes)
4. [API Implementation](#api-implementation)
5. [SCORM Runtime & Player](#scorm-runtime--player)
6. [File Management](#file-management)
7. [Integration Points](#integration-points)
8. [Testing Strategy](#testing-strategy)
9. [Implementation Phases](#implementation-phases)
10. [Security Considerations](#security-considerations)

---

## Overview

### What is SCORM?

SCORM is an e-learning standard that defines:
- **Content Packaging**: How to bundle learning content with metadata
- **Run-Time Communication**: How content communicates with the LMS
- **Sequencing & Navigation**: How learners move through content
- **Tracking & Reporting**: How to record learner progress and scores

### Supported Standards

- **SCORM 1.2**: Widely adopted, simpler implementation
- **SCORM 2004 4th Edition**: More advanced sequencing and navigation

### Key Features to Implement

1. SCORM package upload and validation
2. Package extraction and storage
3. Content delivery and player
4. Runtime API (SCORM API Adapter)
5. Progress tracking and reporting
6. CMI (Computer Managed Instruction) data storage
7. Completion and success tracking
8. Score/grade recording
9. Time tracking (session time, total time)
10. Suspend/resume functionality

---

## Architecture Design

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  - SCORM Content Player (iframe-based)                      │
│  - Admin Upload Interface                                    │
│  - Student Learning Dashboard                                │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   API Layer (Express)                        │
│  - SCORM Package Management Routes                          │
│  - Content Delivery Routes                                   │
│  - Runtime API Routes                                        │
│  - Tracking & Reporting Routes                               │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
│  - Package Validator & Parser                               │
│  - Manifest (imsmanifest.xml) Parser                        │
│  - Runtime API Handler                                       │
│  - CMI Data Manager                                          │
│  - Completion Calculator                                     │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│  - MongoDB (ScormPackage, ScormAttempt, ScormCMI)           │
│  - File System (Extracted SCORM content)                    │
│  - S3/Cloud Storage (Optional: for scalability)             │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
lms_node/
├── model/
│   └── Scorm/
│       ├── ScormPackage.ts       # SCORM package metadata
│       ├── ScormAttempt.ts       # Student attempts/sessions
│       └── ScormCMI.ts            # CMI data store
├── controller/
│   └── scorm/
│       ├── scormPackageCtrl.ts   # Package CRUD operations
│       ├── scormPlayerCtrl.ts    # Content delivery
│       ├── scormRuntimeCtrl.ts   # SCORM API communication
│       └── scormReportCtrl.ts    # Tracking and reporting
├── routes/
│   └── scorm/
│       ├── scormPackageRoutes.ts
│       ├── scormPlayerRoutes.ts
│       └── scormRuntimeRoutes.ts
├── utils/
│   └── scorm/
│       ├── packageValidator.ts    # Validate SCORM packages
│       ├── manifestParser.ts      # Parse imsmanifest.xml
│       ├── scormRuntime.ts        # SCORM API implementation
│       ├── cmiDataMapper.ts       # Map CMI data structures
│       ├── completionCalculator.ts # Determine completion status
│       └── scormZipExtractor.ts   # Extract ZIP packages
├── validators/
│   └── scormValidation.ts         # Joi validation schemas
├── types/
│   └── scorm.ts                   # SCORM TypeScript interfaces
├── middlewares/
│   └── scormAuth.ts               # SCORM-specific authorization
└── scorm-content/                 # Extracted SCORM packages
    └── packages/
        └── [package-id]/
            ├── imsmanifest.xml
            ├── index.html
            └── ...content files
```

---

## Database Schema Changes

### 1. ScormPackage Model

**Purpose**: Store SCORM package metadata and structure

```typescript
interface IScormPackage {
  // Identification
  packageId: string;                    // Unique identifier
  title: string;                        // Package title
  description?: string;                 // Package description
  version: 'scorm_1.2' | 'scorm_2004'; // SCORM version
  
  // File Information
  fileName: string;                     // Original uploaded filename
  fileSize: number;                     // Size in bytes
  uploadedAt: Date;                     // Upload timestamp
  filePath: string;                     // Path to extracted content
  
  // Manifest Data
  manifestData: {
    identifier: string;                 // From imsmanifest.xml
    organizations: Array<{
      identifier: string;
      title: string;
      items: Array<{
        identifier: string;
        title: string;
        identifierref?: string;
        type?: string;
      }>;
    }>;
    resources: Array<{
      identifier: string;
      type: string;
      href: string;                     // Entry point (e.g., index.html)
      dependencies?: string[];
    }>;
    metadata?: {
      schemaVersion?: string;
      title?: string;
      description?: string;
      keywords?: string[];
      duration?: string;
    };
  };
  
  // Launch Information
  launchUrl: string;                    // Primary launch URL
  entryPoint: string;                   // Main content file
  
  // Academic Integration
  subject?: mongoose.Types.ObjectId;    // Link to Subject
  program?: mongoose.Types.ObjectId;    // Link to Program
  classLevel?: mongoose.Types.ObjectId; // Link to ClassLevel
  academicTerm?: mongoose.Types.ObjectId; // Link to AcademicTerm
  
  // Assignment/Grading
  isGraded: boolean;                    // Whether to record scores
  passingScore?: number;                // Minimum passing score (0-100)
  maxScore: number;                     // Maximum achievable score
  weight?: number;                      // Weight in overall grade
  dueDate?: Date;                       // Assignment due date
  
  // Access Control
  createdBy: mongoose.Types.ObjectId;   // Admin/Teacher who uploaded
  assignedTo: {
    students?: mongoose.Types.ObjectId[]; // Specific students
    classLevels?: mongoose.Types.ObjectId[]; // Or entire classes
    programs?: mongoose.Types.ObjectId[]; // Or programs
  };
  
  // Status
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  
  // Tracking Settings
  trackingOptions: {
    trackTime: boolean;
    trackScore: boolean;
    trackCompletion: boolean;
    trackInteractions: boolean;
    allowMultipleAttempts: boolean;
    maxAttempts?: number;
    timeLimit?: number;                 // In minutes
  };
  
  // Statistics
  stats: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore?: number;
    averageTimeSpent?: number;          // In seconds
  };
}
```

### 2. ScormAttempt Model

**Purpose**: Track individual student attempts/sessions

```typescript
interface IScormAttempt {
  // Identification
  attemptId: string;                    // Unique attempt ID
  
  // Relationships
  student: mongoose.Types.ObjectId;     // Student reference
  package: mongoose.Types.ObjectId;     // ScormPackage reference
  
  // Attempt Information
  attemptNumber: number;                // 1st attempt, 2nd attempt, etc.
  startedAt: Date;                      // Session start time
  lastAccessedAt: Date;                 // Last interaction time
  completedAt?: Date;                   // Completion timestamp
  
  // Status
  status: 'not_started' | 'incomplete' | 'completed' | 'passed' | 'failed' | 'suspended';
  
  // SCORM Data Model (CMI)
  cmi: {
    // Core Data
    completion_status: 'completed' | 'incomplete' | 'not attempted' | 'unknown';
    success_status: 'passed' | 'failed' | 'unknown';
    
    // Score
    score: {
      raw?: number;                     // Raw score
      min?: number;                     // Minimum score
      max?: number;                     // Maximum score
      scaled?: number;                  // Scaled score (-1 to 1)
    };
    
    // Time Tracking
    session_time: string;               // ISO 8601 duration (PT1H30M)
    total_time: string;                 // Cumulative time
    
    // Location & Suspend Data
    location?: string;                  // Bookmark location
    suspend_data?: string;              // Suspend state data
    
    // Learner Preference
    learner_preference: {
      audio_level?: number;
      language?: string;
      delivery_speed?: number;
      audio_captioning?: number;
    };
    
    // Objectives (SCORM 2004)
    objectives?: Array<{
      id: string;
      score?: {
        raw?: number;
        min?: number;
        max?: number;
        scaled?: number;
      };
      success_status?: 'passed' | 'failed' | 'unknown';
      completion_status?: 'completed' | 'incomplete' | 'not attempted' | 'unknown';
      description?: string;
    }>;
    
    // Interactions
    interactions?: Array<{
      id: string;
      type: 'true-false' | 'choice' | 'fill-in' | 'long-fill-in' | 'matching' | 'performance' | 'sequencing' | 'likert' | 'numeric' | 'other';
      timestamp: Date;
      correct_responses?: Array<{
        pattern: string;
      }>;
      weighting?: number;
      learner_response?: string;
      result?: 'correct' | 'incorrect' | 'unanticipated' | 'neutral';
      latency?: string;                 // ISO 8601 duration
      description?: string;
    }>;
    
    // Comments
    comments_from_learner?: Array<{
      comment: string;
      location?: string;
      timestamp: Date;
    }>;
    
    comments_from_lms?: Array<{
      comment: string;
      location?: string;
      timestamp: Date;
    }>;
    
    // Additional SCORM 1.2 fields
    entry?: 'ab-initio' | 'resume' | '';
    exit?: 'timeout' | 'suspend' | 'logout' | '';
    credit?: 'credit' | 'no-credit';
    mode?: 'browse' | 'normal' | 'review';
  };
  
  // Raw CMI Data (for debugging)
  rawCmiData: Map<string, any>;         // Key-value store of all CMI elements
  
  // Session Logs
  interactionLog: Array<{
    timestamp: Date;
    action: 'Initialize' | 'GetValue' | 'SetValue' | 'Commit' | 'Terminate';
    element?: string;
    value?: any;
    errorCode?: string;
  }>;
}
```

### 3. Student Model Updates

**Purpose**: Add SCORM tracking to existing Student model

```typescript
// Add to existing IStudent interface
interface IStudent {
  // ... existing fields
  
  scormProgress: {
    enrolledPackages: mongoose.Types.ObjectId[]; // ScormPackage IDs
    totalAttempts: number;
    completedPackages: number;
    averageScore?: number;
    totalTimeSpent: number;              // Total seconds across all packages
  };
}
```

### 4. Indexes for Performance

```typescript
// ScormPackage indexes
packageSchema.index({ packageId: 1 }, { unique: true });
packageSchema.index({ createdBy: 1 });
packageSchema.index({ status: 1, isActive: 1 });
packageSchema.index({ 'assignedTo.students': 1 });
packageSchema.index({ 'assignedTo.classLevels': 1 });
packageSchema.index({ subject: 1, program: 1 });

// ScormAttempt indexes
attemptSchema.index({ attemptId: 1 }, { unique: true });
attemptSchema.index({ student: 1, package: 1 });
attemptSchema.index({ student: 1, status: 1 });
attemptSchema.index({ package: 1, status: 1 });
attemptSchema.index({ startedAt: -1 });
attemptSchema.index({ student: 1, package: 1, attemptNumber: 1 }, { unique: true });
```

---

## API Implementation

### 1. Package Management Endpoints

#### Upload SCORM Package
```
POST /api/v1/scorm/packages
Content-Type: multipart/form-data

Request Body:
- file: SCORM ZIP package
- title: string
- description?: string
- subject?: ObjectId
- program?: ObjectId
- assignedTo?: {students?, classLevels?, programs?}
- isGraded: boolean
- passingScore?: number
- trackingOptions: object

Response:
{
  success: true,
  data: {
    packageId: string,
    title: string,
    version: string,
    launchUrl: string,
    status: string
  }
}
```

#### Get All Packages
```
GET /api/v1/scorm/packages
Query Params:
- status?: 'draft' | 'published' | 'archived'
- subject?: ObjectId
- program?: ObjectId
- page?: number
- limit?: number

Response:
{
  success: true,
  data: ScormPackage[],
  pagination: {...}
}
```

#### Get Package Details
```
GET /api/v1/scorm/packages/:packageId

Response:
{
  success: true,
  data: ScormPackage
}
```

#### Update Package
```
PUT /api/v1/scorm/packages/:packageId

Request Body:
{
  title?: string,
  description?: string,
  status?: string,
  assignedTo?: object,
  trackingOptions?: object
}

Response:
{
  success: true,
  data: ScormPackage
}
```

#### Delete Package
```
DELETE /api/v1/scorm/packages/:packageId

Response:
{
  success: true,
  message: "Package deleted successfully"
}
```

### 2. Content Delivery Endpoints

#### Launch SCORM Content
```
GET /api/v1/scorm/player/:packageId/launch

Response:
- HTML page with SCORM player
- Embedded iframe with content
- SCORM API adapter loaded
```

#### Serve SCORM Resources
```
GET /api/v1/scorm/content/:packageId/*

Response:
- Static files from extracted package (HTML, JS, CSS, images, etc.)
- Proper MIME types
- Cache headers
```

### 3. Runtime API Endpoints

#### Initialize Attempt
```
POST /api/v1/scorm/runtime/:packageId/initialize

Request Body:
{
  attemptNumber?: number  // Resume specific attempt or start new
}

Response:
{
  success: true,
  data: {
    attemptId: string,
    cmi: object,  // Initial CMI data
    apiVersion: string
  }
}
```

#### Get CMI Value
```
GET /api/v1/scorm/runtime/:attemptId/cmi/:element

Example: GET /api/v1/scorm/runtime/abc123/cmi/cmi.core.score.raw

Response:
{
  success: true,
  data: {
    element: "cmi.core.score.raw",
    value: "85"
  }
}
```

#### Set CMI Value
```
PUT /api/v1/scorm/runtime/:attemptId/cmi/:element

Request Body:
{
  value: any
}

Example: PUT /api/v1/scorm/runtime/abc123/cmi/cmi.core.score.raw
{ value: "85" }

Response:
{
  success: true,
  data: {
    element: "cmi.core.score.raw",
    value: "85",
    errorCode: "0"
  }
}
```

#### Commit Data
```
POST /api/v1/scorm/runtime/:attemptId/commit

Request Body:
{
  cmiData: object  // Bulk CMI updates
}

Response:
{
  success: true,
  message: "Data committed successfully"
}
```

#### Terminate Attempt
```
POST /api/v1/scorm/runtime/:attemptId/terminate

Request Body:
{
  exitReason?: 'suspend' | 'logout' | 'timeout'
}

Response:
{
  success: true,
  data: {
    attemptId: string,
    status: string,
    score: number,
    completionStatus: string
  }
}
```

### 4. Tracking & Reporting Endpoints

#### Get Student Progress
```
GET /api/v1/scorm/tracking/student/:studentId

Response:
{
  success: true,
  data: {
    student: ObjectId,
    packages: Array<{
      package: ScormPackage,
      attempts: ScormAttempt[],
      bestScore: number,
      completionStatus: string,
      totalTimeSpent: number
    }>
  }
}
```

#### Get Package Analytics
```
GET /api/v1/scorm/tracking/package/:packageId/analytics

Response:
{
  success: true,
  data: {
    totalStudents: number,
    completedStudents: number,
    averageScore: number,
    averageTimeSpent: number,
    passRate: number,
    studentProgress: Array<{
      student: Student,
      attempts: number,
      bestScore: number,
      status: string,
      lastAccessed: Date
    }>
  }
}
```

#### Get Student Attempt Details
```
GET /api/v1/scorm/tracking/attempts/:attemptId

Response:
{
  success: true,
  data: ScormAttempt
}
```

#### Export Tracking Data
```
GET /api/v1/scorm/tracking/export
Query Params:
- packageId?: ObjectId
- studentId?: ObjectId
- startDate?: Date
- endDate?: Date
- format: 'json' | 'csv' | 'xlsx'

Response:
- File download with tracking data
```

---

## SCORM Runtime & Player

### 1. SCORM API Adapter (Client-Side)

**Purpose**: JavaScript API that SCORM content uses to communicate with LMS

```javascript
// File: public/scorm/scorm-api-adapter.js

/**
 * SCORM 1.2 API Adapter
 */
function API() {
  this.attemptId = null;
  this.cmiData = {};
  this.errorCode = "0";
  this.diagnostic = "";
  
  // LMSInitialize
  this.LMSInitialize = function(param) {
    if (param !== "") return "false";
    
    // Call backend to initialize attempt
    fetch(`/api/v1/scorm/runtime/${packageId}/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
      this.attemptId = data.data.attemptId;
      this.cmiData = data.data.cmi;
    });
    
    return "true";
  };
  
  // LMSGetValue
  this.LMSGetValue = function(element) {
    // Return value from local cache or fetch from server
    return this.cmiData[element] || "";
  };
  
  // LMSSetValue
  this.LMSSetValue = function(element, value) {
    this.cmiData[element] = value;
    
    // Debounced update to backend
    this.queueUpdate(element, value);
    
    return "true";
  };
  
  // LMSCommit
  this.LMSCommit = function(param) {
    if (param !== "") return "false";
    
    // Send all cached data to backend
    fetch(`/api/v1/scorm/runtime/${this.attemptId}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ cmiData: this.cmiData })
    });
    
    return "true";
  };
  
  // LMSFinish
  this.LMSFinish = function(param) {
    if (param !== "") return "false";
    
    this.LMSCommit("");
    
    fetch(`/api/v1/scorm/runtime/${this.attemptId}/terminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    return "true";
  };
  
  // LMSGetLastError
  this.LMSGetLastError = function() {
    return this.errorCode;
  };
  
  // LMSGetErrorString
  this.LMSGetErrorString = function(errorCode) {
    // Return error string for code
    return errorStrings[errorCode] || "Unknown error";
  };
  
  // LMSGetDiagnostic
  this.LMSGetDiagnostic = function(errorCode) {
    return this.diagnostic;
  };
}

/**
 * SCORM 2004 API Adapter
 */
function API_1484_11() {
  // Similar structure but with SCORM 2004 method names
  // Initialize, GetValue, SetValue, Commit, Terminate
  // GetLastError, GetErrorString, GetDiagnostic
}

// Make API available to SCORM content
window.API = new API();
window.API_1484_11 = new API_1484_11();
```

### 2. SCORM Player (HTML/React Component)

```html
<!-- File: public/scorm/player.html -->
<!DOCTYPE html>
<html>
<head>
  <title>SCORM Player</title>
  <script src="/scorm/scorm-api-adapter.js"></script>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      height: 100%;
      overflow: hidden;
    }
    #scorm-frame {
      width: 100%;
      height: 100%;
      border: none;
    }
    #player-controls {
      position: fixed;
      bottom: 0;
      width: 100%;
      background: #333;
      color: white;
      padding: 10px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <iframe id="scorm-frame" src=""></iframe>
  
  <div id="player-controls">
    <div id="status">Status: Not Started</div>
    <div id="score">Score: --</div>
    <div id="time">Time: 00:00:00</div>
    <button onclick="exitPlayer()">Exit</button>
  </div>
  
  <script>
    const packageId = '{{packageId}}';
    const launchUrl = '{{launchUrl}}';
    
    // Load SCORM content
    document.getElementById('scorm-frame').src = 
      `/api/v1/scorm/content/${packageId}/${launchUrl}`;
    
    // Monitor session time
    let sessionStart = Date.now();
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      document.getElementById('time').textContent = 
        `Time: ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }, 1000);
    
    function pad(num) {
      return String(num).padStart(2, '0');
    }
    
    function exitPlayer() {
      if (confirm('Are you sure you want to exit?')) {
        window.API.LMSFinish("");
        window.close();
      }
    }
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      window.API.LMSCommit("");
    });
  </script>
</body>
</html>
```

---

## File Management

### 1. Package Upload & Extraction

```typescript
// File: utils/scorm/scormZipExtractor.ts

import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs-extra';

export class ScormZipExtractor {
  private readonly contentDir = './scorm-content/packages';
  
  async extractPackage(zipBuffer: Buffer, packageId: string): Promise<string> {
    const zip = new AdmZip(zipBuffer);
    const extractPath = path.join(this.contentDir, packageId);
    
    // Create directory
    await fs.ensureDir(extractPath);
    
    // Extract all files
    zip.extractAllTo(extractPath, true);
    
    // Verify imsmanifest.xml exists
    const manifestPath = path.join(extractPath, 'imsmanifest.xml');
    if (!await fs.pathExists(manifestPath)) {
      throw new Error('Invalid SCORM package: imsmanifest.xml not found');
    }
    
    return extractPath;
  }
  
  async deletePackage(packageId: string): Promise<void> {
    const extractPath = path.join(this.contentDir, packageId);
    await fs.remove(extractPath);
  }
}
```

### 2. Manifest Parser

```typescript
// File: utils/scorm/manifestParser.ts

import { parseStringPromise } from 'xml2js';
import fs from 'fs-extra';
import path from 'path';

export interface ManifestData {
  identifier: string;
  version: 'scorm_1.2' | 'scorm_2004';
  organizations: any[];
  resources: any[];
  metadata?: any;
}

export class ManifestParser {
  async parse(manifestPath: string): Promise<ManifestData> {
    const xml = await fs.readFile(manifestPath, 'utf-8');
    const parsed = await parseStringPromise(xml);
    
    const manifest = parsed.manifest;
    
    // Detect SCORM version
    const version = this.detectVersion(manifest);
    
    // Extract organizations
    const organizations = this.parseOrganizations(manifest.organizations);
    
    // Extract resources
    const resources = this.parseResources(manifest.resources);
    
    // Extract metadata
    const metadata = this.parseMetadata(manifest.metadata);
    
    return {
      identifier: manifest.$.identifier,
      version,
      organizations,
      resources,
      metadata
    };
  }
  
  private detectVersion(manifest: any): 'scorm_1.2' | 'scorm_2004' {
    const schemaVersion = manifest.metadata?.[0]?.schemaversion?.[0];
    
    if (schemaVersion?.includes('1.2')) return 'scorm_1.2';
    if (schemaVersion?.includes('2004') || schemaVersion?.includes('1.3')) {
      return 'scorm_2004';
    }
    
    // Fallback: check namespace
    const namespace = manifest.$?.['xmlns'] || '';
    if (namespace.includes('IMS_1.2')) return 'scorm_1.2';
    if (namespace.includes('IMS_2004')) return 'scorm_2004';
    
    return 'scorm_1.2'; // Default
  }
  
  private parseOrganizations(orgs: any): any[] {
    // Parse organization structure
    // Extract items, titles, identifierrefs, etc.
    return [];
  }
  
  private parseResources(resources: any): any[] {
    // Parse resources
    // Extract identifiers, types, hrefs, dependencies
    return [];
  }
  
  private parseMetadata(metadata: any): any {
    // Extract title, description, keywords, etc.
    return {};
  }
  
  getLaunchUrl(manifestData: ManifestData): string {
    // Find the primary resource href
    const defaultOrg = manifestData.organizations[0];
    const firstItem = defaultOrg?.items?.[0];
    const resourceId = firstItem?.identifierref;
    
    const resource = manifestData.resources.find(
      r => r.identifier === resourceId
    );
    
    return resource?.href || 'index.html';
  }
}
```

### 3. Package Validator

```typescript
// File: utils/scorm/packageValidator.ts

export class PackageValidator {
  async validatePackage(zipBuffer: Buffer): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();
      
      // Check for imsmanifest.xml
      const hasManifest = entries.some(e => e.entryName === 'imsmanifest.xml');
      if (!hasManifest) {
        errors.push('Missing imsmanifest.xml');
        return { isValid: false, errors, warnings };
      }
      
      // Extract and parse manifest
      const manifestEntry = zip.getEntry('imsmanifest.xml');
      const manifestXml = manifestEntry.getData().toString('utf-8');
      
      // Validate XML structure
      // Check required elements
      // Validate SCORM version
      // Check resource references
      
      // Check file references in manifest exist in ZIP
      const parser = new ManifestParser();
      const manifestData = await parser.parse(manifestXml);
      
      for (const resource of manifestData.resources) {
        const fileExists = entries.some(e => e.entryName === resource.href);
        if (!fileExists) {
          warnings.push(`Referenced file not found: ${resource.href}`);
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        version: manifestData.version
      };
      
    } catch (err) {
      errors.push(`Validation error: ${err.message}`);
      return { isValid: false, errors, warnings };
    }
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  version?: string;
}
```

---

## Integration Points

### 1. Student Dashboard

**Display enrolled SCORM packages**
```
/student/dashboard
- List of assigned SCORM packages
- Progress indicators (% complete, score, time spent)
- Launch buttons
- Resume from last position
```

### 2. Teacher/Admin Interface

**Package Management**
```
/admin/scorm/packages
- Upload new packages
- View all packages
- Edit package settings
- Assign to students/classes
- View analytics
```

**Grading Integration**
```
/teacher/grades
- SCORM scores integrated into gradebook
- View student attempts
- Override scores if needed
- Export tracking data
```

### 3. Reporting Dashboard

**Analytics Views**
```
/admin/scorm/analytics
- Package completion rates
- Average scores by package
- Time spent analysis
- Student progress tracking
- Interaction data visualization
```

### 4. Existing Models Integration

**Link SCORM to Academic Structure**
- Associate packages with Subjects
- Assign to Programs
- Assign to Class Levels
- Tie to Academic Terms
- Include in exam/assignment system

**Grade Calculation**
- SCORM scores contribute to final grades
- Weight SCORM packages in grade calculation
- Track completion as part of course requirements

---

## Testing Strategy

### 1. Unit Tests

```typescript
// Test package validation
describe('PackageValidator', () => {
  it('should validate a valid SCORM 1.2 package', async () => {
    const result = await validator.validatePackage(validZip);
    expect(result.isValid).toBe(true);
    expect(result.version).toBe('scorm_1.2');
  });
  
  it('should reject package without manifest', async () => {
    const result = await validator.validatePackage(invalidZip);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Missing imsmanifest.xml');
  });
});

// Test manifest parser
describe('ManifestParser', () => {
  it('should parse SCORM 1.2 manifest correctly', async () => {
    const data = await parser.parse(manifestPath);
    expect(data.identifier).toBeDefined();
    expect(data.organizations.length).toBeGreaterThan(0);
  });
});

// Test CMI data mapper
describe('CmiDataMapper', () => {
  it('should map SCORM 1.2 score correctly', () => {
    const mapped = mapper.mapScore('85', '100');
    expect(mapped.raw).toBe(85);
    expect(mapped.max).toBe(100);
  });
});
```

### 2. Integration Tests

```typescript
// Test package upload flow
describe('SCORM Package Upload', () => {
  it('should upload, extract, and parse package', async () => {
    const response = await request(app)
      .post('/api/v1/scorm/packages')
      .attach('file', packagePath)
      .field('title', 'Test Package')
      .expect(201);
    
    expect(response.body.data.packageId).toBeDefined();
    
    // Verify files extracted
    const extractPath = `./scorm-content/packages/${response.body.data.packageId}`;
    expect(fs.existsSync(extractPath)).toBe(true);
  });
});

// Test runtime API
describe('SCORM Runtime API', () => {
  it('should initialize attempt and return CMI data', async () => {
    const response = await request(app)
      .post(`/api/v1/scorm/runtime/${packageId}/initialize`)
      .expect(200);
    
    expect(response.body.data.attemptId).toBeDefined();
    expect(response.body.data.cmi).toBeDefined();
  });
  
  it('should set and get CMI values', async () => {
    // Set value
    await request(app)
      .put(`/api/v1/scorm/runtime/${attemptId}/cmi/cmi.core.score.raw`)
      .send({ value: '85' })
      .expect(200);
    
    // Get value
    const response = await request(app)
      .get(`/api/v1/scorm/runtime/${attemptId}/cmi/cmi.core.score.raw`)
      .expect(200);
    
    expect(response.body.data.value).toBe('85');
  });
});
```

### 3. E2E Tests

```typescript
// Test complete student workflow
describe('Student SCORM Workflow', () => {
  it('should allow student to launch, complete, and get scored', async () => {
    // 1. Student launches package
    // 2. SCORM content initializes
    // 3. Student completes content
    // 4. Score is recorded
    // 5. Completion status updated
    // 6. Grade reflected in gradebook
  });
});
```

### 4. SCORM Conformance Testing

- Use SCORM test suites (e.g., ADL SCORM Test Suite)
- Test with real SCORM packages from various authoring tools
- Verify against SCORM 1.2 and 2004 specifications
- Test with packages from: Articulate Storyline, Adobe Captivate, iSpring

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Deliverables:**
- [ ] TypeScript type definitions for SCORM
- [ ] Database models (ScormPackage, ScormAttempt)
- [ ] Package validator utility
- [ ] Manifest parser utility
- [ ] ZIP extractor utility
- [ ] Basic file structure setup

**Tasks:**
1. Create `types/scorm.ts` with all interfaces
2. Create `model/Scorm/ScormPackage.ts`
3. Create `model/Scorm/ScormAttempt.ts`
4. Implement `utils/scorm/packageValidator.ts`
5. Implement `utils/scorm/manifestParser.ts`
6. Implement `utils/scorm/scormZipExtractor.ts`
7. Write unit tests for utilities
8. Create migration script to add scorm indexes

### Phase 2: Package Management (Week 3-4)

**Deliverables:**
- [ ] Package upload API
- [ ] Package CRUD operations
- [ ] Content delivery endpoints
- [ ] Admin interface for package management
- [ ] Package assignment to students

**Tasks:**
1. Create `controller/scorm/scormPackageCtrl.ts`
2. Create `routes/scorm/scormPackageRoutes.ts`
3. Implement upload with multer
4. Implement package extraction on upload
5. Implement manifest parsing
6. Create package list/detail endpoints
7. Implement package assignment logic
8. Create Joi validators in `validators/scormValidation.ts`
9. Build admin UI for package management
10. Write integration tests

### Phase 3: SCORM Runtime (Week 5-6)

**Deliverables:**
- [ ] SCORM API adapter (client-side JavaScript)
- [ ] Runtime API endpoints (Initialize, GetValue, SetValue, Commit, Terminate)
- [ ] CMI data management
- [ ] Attempt tracking
- [ ] Session management

**Tasks:**
1. Create `public/scorm/scorm-api-adapter.js` (SCORM 1.2)
2. Create `public/scorm/scorm-api-2004.js` (SCORM 2004)
3. Create `controller/scorm/scormRuntimeCtrl.ts`
4. Create `routes/scorm/scormRuntimeRoutes.ts`
5. Implement Initialize endpoint
6. Implement GetValue/SetValue endpoints
7. Implement Commit endpoint
8. Implement Terminate endpoint
9. Create `utils/scorm/cmiDataMapper.ts`
10. Handle CMI data validation
11. Implement session timeout handling
12. Write unit and integration tests

### Phase 4: Content Player (Week 7-8)

**Deliverables:**
- [ ] SCORM player HTML/UI
- [ ] Content delivery with proper routing
- [ ] Launch page with attempt initialization
- [ ] Progress tracking UI
- [ ] Exit/suspend functionality

**Tasks:**
1. Create `public/scorm/player.html`
2. Create `controller/scorm/scormPlayerCtrl.ts`
3. Create `routes/scorm/scormPlayerRoutes.ts`
4. Implement static content serving
5. Implement launch page
6. Add player controls (time, score, status)
7. Handle window close/refresh
8. Implement suspend/resume
9. Build React component for player (if using React)
10. Test with multiple SCORM packages

### Phase 5: Tracking & Reporting (Week 9-10)

**Deliverables:**
- [ ] Student progress dashboard
- [ ] Teacher analytics dashboard
- [ ] Completion tracking
- [ ] Score tracking and grading integration
- [ ] Time tracking
- [ ] Export functionality

**Tasks:**
1. Create `controller/scorm/scormReportCtrl.ts`
2. Create `routes/scorm/scormReportRoutes.ts`
3. Implement student progress endpoint
4. Implement package analytics endpoint
5. Create `utils/scorm/completionCalculator.ts`
6. Integrate SCORM scores into grade calculation
7. Build student dashboard UI
8. Build teacher analytics UI
9. Implement data export (CSV, JSON, Excel)
10. Create charts/visualizations
11. Write reporting tests

### Phase 6: Integration & Polish (Week 11-12)

**Deliverables:**
- [ ] Integration with existing Student model
- [ ] Integration with Subject/Program/ClassLevel
- [ ] Integration with grading system
- [ ] Role-based access control
- [ ] Documentation
- [ ] Performance optimization

**Tasks:**
1. Update Student model with scormProgress field
2. Link SCORM packages to academic entities
3. Integrate into main navigation
4. Implement RBAC for SCORM features
5. Add caching for content delivery
6. Optimize database queries
7. Write API documentation
8. Write user guide
9. Write admin guide
10. Perform load testing
11. Security audit
12. Final E2E testing

### Phase 7: Production Deployment (Week 13)

**Deliverables:**
- [ ] Production deployment
- [ ] Monitoring and logging
- [ ] Backup strategy
- [ ] User training

**Tasks:**
1. Configure PM2 for SCORM routes
2. Set up file storage (S3 or local with backup)
3. Configure nginx for static content
4. Set up monitoring (file storage usage, API response times)
5. Implement log aggregation for SCORM events
6. Create backup script for SCORM content
7. Train administrators
8. Train teachers
9. Create student help documentation
10. Go live with pilot group

---

## Security Considerations

### 1. File Upload Security

**Risks:**
- Malicious ZIP files (zip bombs, path traversal)
- Executable code injection
- Large file DoS attacks

**Mitigations:**
- Validate ZIP file structure before extraction
- Limit file size (e.g., 500MB max)
- Scan for path traversal attempts (`../`, absolute paths)
- Use virus scanning (ClamAV or cloud service)
- Extract to isolated directory with restricted permissions
- Validate manifest XML against XXE attacks
- Sanitize all file names

```typescript
// Example: File upload middleware
import multer from 'multer';
import crypto from 'crypto';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/zip') {
      return cb(new Error('Only ZIP files allowed'));
    }
    cb(null, true);
  }
});
```

### 2. Content Delivery Security

**Risks:**
- Unauthorized access to content
- XSS attacks from SCORM content
- CSRF attacks on runtime API

**Mitigations:**
- Authenticate all content requests
- Verify student is assigned to package
- Serve SCORM content with restrictive CSP headers
- Use SameSite cookies
- Implement CSRF tokens for runtime API
- Sandbox iframe with restricted permissions
- Validate all CMI data inputs

```typescript
// Example: Content authorization middleware
export const authorizeScormContent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { packageId } = req.params;
  const studentId = req.userAuth._id;
  
  const pkg = await ScormPackage.findOne({ packageId });
  
  if (!pkg) {
    return res.status(404).json({ error: 'Package not found' });
  }
  
  // Check if student is assigned
  const isAssigned = await checkAssignment(pkg, studentId);
  
  if (!isAssigned) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
};
```

### 3. Data Validation

**Risks:**
- CMI data injection
- Score manipulation
- Completion status fraud

**Mitigations:**
- Validate all CMI element names against SCORM spec
- Validate data types and ranges
- Server-side completion calculation
- Score verification logic
- Rate limiting on API calls
- Log all suspicious activity

```typescript
// Example: CMI validation
const VALID_CMI_ELEMENTS = {
  'cmi.core.score.raw': { type: 'number', min: 0, max: 100 },
  'cmi.core.lesson_status': { 
    type: 'string', 
    values: ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted']
  },
  // ... more elements
};

function validateCmiValue(element: string, value: any): boolean {
  const rules = VALID_CMI_ELEMENTS[element];
  if (!rules) return false;
  
  if (rules.type === 'number') {
    const num = Number(value);
    return !isNaN(num) && num >= rules.min && num <= rules.max;
  }
  
  if (rules.values) {
    return rules.values.includes(value);
  }
  
  return true;
}
```

### 4. Access Control

**Roles & Permissions:**
- **Admin**: Upload, delete, assign packages
- **Teacher**: Upload, assign to their classes, view analytics
- **Student**: Launch assigned packages, view own progress

**Implementation:**
```typescript
// Example: Role restriction
import { roleRestriction } from '../../middlewares/roleRestriction';

router.post(
  '/packages',
  isAuthenticated,
  roleRestriction('admin', 'teacher'),
  uploadPackage
);

router.get(
  '/tracking/student/:studentId',
  isAuthenticated,
  checkStudentAccess, // Students can only view own data
  getStudentProgress
);
```

---

## Performance Optimization

### 1. Content Delivery

- **CDN**: Serve static SCORM content via CDN
- **Caching**: Aggressive caching for SCORM resources
- **Compression**: Gzip/Brotli compression
- **HTTP/2**: Use HTTP/2 for parallel resource loading

```typescript
// Example: Cache middleware for SCORM content
app.use('/api/v1/scorm/content', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
  next();
});
```

### 2. Database Optimization

- **Indexes**: Proper indexes on frequently queried fields
- **Aggregation**: Use MongoDB aggregation for analytics
- **Projection**: Only fetch required fields
- **Connection Pooling**: Optimize MongoDB connections

```typescript
// Example: Optimized analytics query
const analytics = await ScormAttempt.aggregate([
  { $match: { package: packageId, status: 'completed' } },
  {
    $group: {
      _id: '$package',
      avgScore: { $avg: '$cmi.score.raw' },
      totalAttempts: { $sum: 1 },
      avgTime: { $avg: '$totalSeconds' }
    }
  }
]);
```

### 3. API Optimization

- **Debouncing**: Debounce CMI SetValue calls
- **Batching**: Batch CMI updates in Commit
- **WebSockets**: Consider WebSockets for real-time updates
- **Rate Limiting**: Prevent API abuse

---

## Dependencies & Tools

### NPM Packages to Install

```json
{
  "dependencies": {
    "adm-zip": "^0.5.10",          // ZIP extraction
    "xml2js": "^0.6.2",             // XML parsing
    "multer": "^1.4.5-lts.1",       // File uploads
    "fs-extra": "^11.1.1",          // File system utilities
    "uuid": "^9.0.0",               // Generate package IDs
    "dayjs": "^1.11.10",            // Date/time handling
    "joi": "^17.11.0"               // Already installed
  },
  "devDependencies": {
    "@types/adm-zip": "^0.5.5",
    "@types/xml2js": "^0.4.14",
    "@types/multer": "^1.4.11",
    "@types/fs-extra": "^11.0.4"
  }
}
```

### Optional Tools

- **SCORM Cloud**: Test packages against industry-standard runtime
- **ADL SCORM Test Suite**: Validate SCORM conformance
- **ClamAV**: Virus scanning for uploaded files
- **AWS S3**: Cloud storage for SCORM packages (scalability)

---

## Documentation Requirements

### 1. API Documentation

- OpenAPI/Swagger specs for all endpoints
- Request/response examples
- Error codes and messages
- Authentication requirements

### 2. Developer Documentation

- Architecture overview
- Database schema diagrams
- SCORM implementation details
- Code examples for common tasks
- Testing guide

### 3. User Documentation

**Admin Guide:**
- How to upload SCORM packages
- How to assign packages to students
- How to view analytics
- Troubleshooting common issues

**Teacher Guide:**
- How to integrate SCORM in curriculum
- How to view student progress
- How to grade SCORM activities

**Student Guide:**
- How to launch SCORM content
- How to track own progress
- How to resume suspended content
- Browser requirements

---

## Success Metrics

### Technical Metrics

- [ ] 100% SCORM 1.2 conformance
- [ ] 95%+ SCORM 2004 conformance
- [ ] Content loads in < 2 seconds
- [ ] API response time < 200ms
- [ ] Support packages up to 500MB
- [ ] Handle 100+ concurrent users

### Business Metrics

- [ ] Student completion rate > 70%
- [ ] Average score improvement
- [ ] Time-on-task tracking accuracy
- [ ] Teacher satisfaction with analytics
- [ ] Reduction in manual grading time

---

## Future Enhancements

### Phase 2 Features (Post-Launch)

1. **xAPI (Tin Can API) Support**
   - Modern successor to SCORM
   - Better analytics and tracking
   - Cross-platform learning

2. **cmi5 Support**
   - xAPI profile for LMS interoperability
   - Improved mobile support

3. **Advanced Analytics**
   - Learning path analysis
   - Predictive analytics
   - A/B testing of content

4. **Content Authoring**
   - Built-in SCORM authoring tool
   - Template library
   - No-code content creation

5. **Social Learning**
   - Peer comments on SCORM content
   - Collaborative completion
   - Leaderboards

6. **Mobile App**
   - Native SCORM player
   - Offline content support
   - Sync when online

7. **AI-Powered Features**
   - Personalized learning paths
   - Content recommendations
   - Automated difficulty adjustment

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding SCORM compatibility to the LMS Node application. The phased approach ensures systematic development with proper testing at each stage.

**Estimated Timeline**: 13 weeks for full implementation

**Key Success Factors:**
- Strict adherence to SCORM specifications
- Thorough testing with real-world SCORM packages
- Performance optimization for content delivery
- Robust security measures
- Comprehensive documentation
- User training and support

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Establish testing protocol with sample SCORM packages
5. Create project tracking board (GitHub Projects or Jira)

---

## Appendix

### A. SCORM Resources

- **SCORM 1.2 Specification**: https://adlnet.gov/projects/scorm/scorm-1-2/
- **SCORM 2004 Specification**: https://adlnet.gov/projects/scorm/scorm-2004-4th/
- **ADL SCORM Test Suite**: https://github.com/adlnet/SCORM-Test-Suite
- **SCORM Cloud**: https://cloud.scorm.com/

### B. Sample SCORM Packages for Testing

- Golf Examples (ADL official samples)
- Rustici Software test packages
- Articulate Storyline sample courses
- Adobe Captivate samples

### C. CMI Data Model Reference

**SCORM 1.2 Core Elements:**
- `cmi.core.student_id`
- `cmi.core.student_name`
- `cmi.core.lesson_location`
- `cmi.core.lesson_status`
- `cmi.core.score.raw`
- `cmi.core.score.max`
- `cmi.core.score.min`
- `cmi.core.session_time`
- `cmi.core.total_time`
- `cmi.suspend_data`

**SCORM 2004 Core Elements:**
- `cmi.completion_status`
- `cmi.success_status`
- `cmi.score.scaled`
- `cmi.score.raw`
- `cmi.score.min`
- `cmi.score.max`
- `cmi.session_time`
- `cmi.total_time`
- `cmi.location`
- `cmi.suspend_data`

### D. Error Codes

**SCORM 1.2:**
- `0` - No error
- `101` - General exception
- `201` - Invalid argument
- `202` - Element cannot have children
- `203` - Element not an array
- `301` - Not initialized
- `401` - Not implemented
- `402` - Invalid set value
- `403` - Element is read only
- `404` - Element is write only
- `405` - Incorrect data type

**SCORM 2004:**
- Similar to 1.2 but with extended codes for sequencing

---

**Document Version**: 1.0  
**Last Updated**: December 19, 2025  
**Author**: LMS Development Team
