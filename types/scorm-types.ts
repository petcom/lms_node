import { Types } from 'mongoose';

/**
 * SCORM TypeScript Type Definitions
 * Supports SCORM 1.2 and SCORM 2004 4th Edition
 */

// ============================================================================
// SCORM Versions
// ============================================================================

export type ScormVersion = 'scorm_1.2' | 'scorm_2004';

// ============================================================================
// Package Status
// ============================================================================

export type PackageStatus = 'draft' | 'published' | 'archived';

// ============================================================================
// Attempt Status
// ============================================================================

export type AttemptStatus =
  | 'not_started'
  | 'incomplete'
  | 'completed'
  | 'passed'
  | 'failed'
  | 'suspended';

// ============================================================================
// CMI Data Types (SCORM 1.2)
// ============================================================================

export type LessonStatus =
  | 'passed'
  | 'completed'
  | 'failed'
  | 'incomplete'
  | 'browsed'
  | 'not attempted';

export type ExitReason = 'timeout' | 'suspend' | 'logout' | '';

export type EntryType = 'ab-initio' | 'resume' | '';

export type CreditType = 'credit' | 'no-credit';

export type ModeType = 'browse' | 'normal' | 'review';

// ============================================================================
// CMI Data Types (SCORM 2004)
// ============================================================================

export type CompletionStatus = 'completed' | 'incomplete' | 'not attempted' | 'unknown';

export type SuccessStatus = 'passed' | 'failed' | 'unknown';

export type InteractionType =
  | 'true-false'
  | 'choice'
  | 'fill-in'
  | 'long-fill-in'
  | 'matching'
  | 'performance'
  | 'sequencing'
  | 'likert'
  | 'numeric'
  | 'other';

export type InteractionResult = 'correct' | 'incorrect' | 'unanticipated' | 'neutral';

// ============================================================================
// Manifest Interfaces
// ============================================================================

export interface IScormMetadata {
  schemaVersion?: string;
  title?: string;
  description?: string;
  keywords?: string[];
  duration?: string;
  language?: string;
  copyright?: string;
}

export interface IScormItem {
  identifier: string;
  title: string;
  identifierref?: string;
  type?: string;
  isVisible?: boolean;
  parameters?: string;
  children?: IScormItem[];
}

export interface IScormOrganization {
  identifier: string;
  title: string;
  structure?: string;
  items: IScormItem[];
}

export interface IScormResource {
  identifier: string;
  type: string;
  href: string;
  scormType?: string;
  dependencies?: string[];
  files?: string[];
}

export interface IScormManifest {
  identifier: string;
  version: ScormVersion;
  organizations: IScormOrganization[];
  resources: IScormResource[];
  metadata?: IScormMetadata;
}

// ============================================================================
// Package Interface
// ============================================================================

export interface IScormPackage {
  _id?: Types.ObjectId;

  // Identification
  packageId: string;
  title: string;
  description?: string;
  version: ScormVersion;

  // File Information
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  filePath: string; // Path in storage (local or S3)

  // Manifest Data
  manifestData: IScormManifest;

  // Launch Information
  launchUrl: string;
  entryPoint: string;

  // Academic Integration
  course?: Types.ObjectId;
  program?: Types.ObjectId;
  programLevel?: Types.ObjectId;
  academicTerm?: Types.ObjectId;
  department?: Types.ObjectId;

  // Assignment/Grading
  isGraded: boolean;
  passingScore?: number;
  maxScore: number;
  weight?: number;
  dueDate?: Date;
  // DCV-034: Grading policy for determining final score
  gradingPolicy?: {
    type: 'final-attempt' | 'best-attempt' | 'average-all' | 'average-last-n';
    averageCount?: number;
  };
  // DCV-034: Maximum attempts allowed (null = unlimited)
  maxAttempts?: number | null;

  // Access Control
  createdBy: Types.ObjectId;
  uploadedBy?: Types.ObjectId;
  uploadedByModel?: 'Admin' | 'Instructor' | 'Learner';
  assignedTo: {
    learners?: Types.ObjectId[];
    classes?: Types.ObjectId[];
    programs?: Types.ObjectId[];
  };

  // Status
  status: PackageStatus;
  isPublished: boolean;
  isGlobal?: boolean;
  publishedAt?: Date;
  publishedBy?: Types.ObjectId;
  publishedByModel?: 'Admin' | 'Instructor';
  unpublishedAt?: Date;
  unpublishedBy?: Types.ObjectId;
  unpublishedByModel?: 'Admin' | 'Instructor';
  isActive: boolean;

  // Tracking Settings
  trackingOptions: {
    trackTime: boolean;
    trackScore: boolean;
    trackCompletion: boolean;
    trackInteractions: boolean;
    allowMultipleAttempts: boolean;
    maxAttempts?: number;
    timeLimit?: number; // In minutes
  };

  // Statistics
  stats: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore?: number;
    averageTimeSpent?: number; // In seconds
  };

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

// ============================================================================
// CMI Data Structures
// ============================================================================

export interface IScormScore {
  raw?: number;
  min?: number;
  max?: number;
  scaled?: number; // SCORM 2004 only (-1 to 1)
}

export interface IScormObjective {
  id: string;
  score?: IScormScore;
  success_status?: SuccessStatus;
  completion_status?: CompletionStatus;
  description?: string;
  progress_measure?: number; // SCORM 2004 only
}

export interface IScormCorrectResponse {
  pattern: string;
}

export interface IScormInteraction {
  id: string;
  type: InteractionType;
  timestamp: Date;
  correct_responses?: IScormCorrectResponse[];
  weighting?: number;
  learner_response?: string;
  result?: InteractionResult;
  latency?: string; // ISO 8601 duration
  description?: string;
}

export interface IScormComment {
  comment: string;
  location?: string;
  timestamp: Date;
}

export interface IScormLearnerPreference {
  audio_level?: number;
  language?: string;
  delivery_speed?: number;
  audio_captioning?: number;
}

export interface IScormCMI {
  // SCORM 1.2 Core Data
  learner_id?: string;
  learner_name?: string;
  lesson_location?: string;
  lesson_status?: LessonStatus;
  entry?: EntryType;
  exit?: ExitReason;
  credit?: CreditType;
  mode?: ModeType;

  // SCORM 2004 Core Data
  completion_status?: CompletionStatus;
  success_status?: SuccessStatus;
  location?: string;

  // Score (both versions)
  score: IScormScore;

  // Time Tracking
  session_time: string; // ISO 8601 duration
  total_time: string; // ISO 8601 duration

  // Suspend Data
  suspend_data?: string;

  // Learner Preference
  learner_preference?: IScormLearnerPreference;

  // Objectives (SCORM 2004)
  objectives?: IScormObjective[];

  // Interactions
  interactions?: IScormInteraction[];

  // Comments
  comments_from_learner?: IScormComment[];
  comments_from_lms?: IScormComment[];

  // Progress (SCORM 2004)
  progress_measure?: number;
  completion_threshold?: number;
  scaled_passing_score?: number;
}

// ============================================================================
// Attempt Interface
// ============================================================================

export interface IScormAttempt {
  _id?: Types.ObjectId;

  // Identification
  attemptId: string;

  // Relationships
  learner: Types.ObjectId;
  package: Types.ObjectId;

  // Attempt Information
  attemptNumber: number;
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt?: Date;

  // Status
  status: AttemptStatus;

  // CMI Data Model
  cmi: IScormCMI;

  // Raw CMI Data (for debugging and full SCORM spec compliance)
  rawCmiData: Map<string, any>;

  // Session Logs
  interactionLog: IScormInteractionLog[];

  // Computed Fields
  timeSpentSeconds: number;
  scorePercentage?: number;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IScormInteractionLog {
  timestamp: Date;
  action: 'Initialize' | 'GetValue' | 'SetValue' | 'Commit' | 'Terminate';
  element?: string;
  value?: any;
  errorCode?: string;
}

// ============================================================================
// Validation Result
// ============================================================================

export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  version?: ScormVersion;
  packageSize?: number;
}

// ============================================================================
// Storage Provider Interface
// ============================================================================

export interface IStorageProvider {
  /**
   * Save a file to storage
   * @param buffer File buffer
   * @param path Storage path
   * @returns Full path/URL to the saved file
   */
  saveFile(buffer: Buffer, path: string): Promise<string>;

  /**
   * Read a file from storage
   * @param path Storage path
   * @returns File buffer
   */
  readFile(path: string): Promise<Buffer>;

  /**
   * Delete a file or directory from storage
   * @param path Storage path
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Check if a file exists
   * @param path Storage path
   * @returns True if file exists
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Get file URL (for serving content)
   * @param path Storage path
   * @returns URL to access the file
   */
  getFileUrl(path: string): string;

  /**
   * List files in a directory
   * @param path Directory path
   * @returns Array of file paths
   */
  listFiles(path: string): Promise<string[]>;
}

// ============================================================================
// Request Body Types
// ============================================================================

export interface IUploadScormPackageRequest {
  title: string;
  description?: string;
  course?: string;
  program?: string;
  programLevel?: string;
  academicTerm?: string;
  isGraded: boolean;
  passingScore?: number;
  maxScore?: number;
  weight?: number;
  dueDate?: Date;
  assignedTo?: {
    learners?: string[];
    classes?: string[];
    programs?: string[];
  };
  trackingOptions?: {
    trackTime: boolean;
    trackScore: boolean;
    trackCompletion: boolean;
    trackInteractions: boolean;
    allowMultipleAttempts: boolean;
    maxAttempts?: number;
    timeLimit?: number;
  };
}

export interface IUpdateScormPackageRequest {
  title?: string;
  description?: string;
  status?: PackageStatus;
  isActive?: boolean;
  assignedTo?: {
    learners?: string[];
    classes?: string[];
    programs?: string[];
  };
  trackingOptions?: {
    trackTime?: boolean;
    trackScore?: boolean;
    trackCompletion?: boolean;
    trackInteractions?: boolean;
    allowMultipleAttempts?: boolean;
    maxAttempts?: number;
    timeLimit?: number;
  };
}

export interface IInitializeAttemptRequest {
  attemptNumber?: number;
}

export interface ISetCMIValueRequest {
  value: any;
}

export interface ICommitDataRequest {
  cmiData: Record<string, any>;
}

export interface ITerminateAttemptRequest {
  exitReason?: ExitReason;
}

// ============================================================================
// Response Types
// ============================================================================

export interface IScormPackageResponse {
  packageId: string;
  title: string;
  description?: string;
  version: ScormVersion;
  launchUrl: string;
  status: PackageStatus;
  isActive: boolean;
  stats: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore?: number;
    averageTimeSpent?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IScormAttemptResponse {
  attemptId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  completionStatus?: CompletionStatus | LessonStatus;
  timeSpentSeconds: number;
}

export interface IInitializeAttemptResponse {
  attemptId: string;
  cmi: IScormCMI;
  apiVersion: string;
}

export interface ICMIValueResponse {
  element: string;
  value: any;
  errorCode: string;
}

// ============================================================================
// Storage Configuration
// ============================================================================

export interface IStorageConfig {
  provider: 'local' | 's3';
  localPath?: string;
  s3Config?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string; // For Digital Ocean Spaces or other S3-compatible
  };
}

// ============================================================================
// Exports
// ============================================================================

export type {
  IScormPackage as ScormPackage,
  IScormAttempt as ScormAttempt,
  IScormManifest as ScormManifest,
  IScormCMI as ScormCMI,
  IScormResource as ScormResource,
  IScormOrganization as ScormOrganization,
  IValidationResult as ValidationResult,
  IStorageProvider as StorageProvider,
};
