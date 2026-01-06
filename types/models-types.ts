// Mongoose document type definitions
import { Document, Types, Model } from 'mongoose';

// User role types (DCV-001: updated to support roles array)
export type UserRole = 'global-admin' | 'staff' | 'learner';
export type UserStatus = 'active' | 'inactive' | 'archived' | 'deleted';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  username?: string;
  passwordHash: string;
  // DCV-001: role -> roles array (supports multi-role persons)
  roles: UserRole[];
  // DCV-001: primaryRole determines default dashboard after login
  primaryRole: UserRole;
  // DCV-001: subroles -> staffRoles (permissions within staff role)
  staffRoles?: string[];
  status: UserStatus;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
  lastLoginAt?: Date | null;
  passwordUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPersonName {
  first: string;
  middle?: string;
  last: string;
  display?: string;
}

export interface IPersonHonor {
  sex?: string;
  gender?: string;
  pronouns?: string;
  honorific?: string;
}

export interface IPersonAddress {
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  isPrimaryCorrespondence?: boolean;
  isPrimaryBilling?: boolean;
}

export interface IPerson extends Document {
  _id: Types.ObjectId;
  name: IPersonName;
  email: string;
  addresses?: IPersonAddress[];
  honor?: IPersonHonor;
  createdAt: Date;
  updatedAt: Date;
}

// Admin Interface
// DCV-016: Removed orphaned arrays (programs, academicTerms, yearGroups, academicYears,
// programLevels, courses, instructors, learners). Global admins access all via role.
// DCV-039: email removed - derive from User via getEmail()
export interface IAdmin extends IPerson {
  department?: Types.ObjectId;
  // DCV-039: Method to get email from User
  getEmail(): Promise<string | undefined>;
}

// Staff Interface
// DCV-021: email removed - derive from User via getEmail()
// DCV-022: department removed - use departmentMemberships / primaryDepartment
// DCV-023: academicYear removed - context from Calendar/Class
// DCV-036: course, program, programLevel, examsCreated removed - use CourseAssignment queries
// DCV-040: isWithdrawn/isSuspended replaced with status enum
export type StaffStatus = 'active' | 'suspended' | 'withdrawn';

export interface IStaff extends IPerson {
  dateEmployed?: Date;
  instructorId?: string;
  status: StaffStatus;
  departmentMemberships?: IDepartmentMembership[];
  applicationStatus: 'pending' | 'approved' | 'rejected';
  createdBy?: Types.ObjectId;
  
  // DCV-021: Method to get email from User
  getEmail(): Promise<string | undefined>;
  // DCV-022: Virtual/method for primary department
  primaryDepartment?: Types.ObjectId;
  getPrimaryDepartment(): Types.ObjectId | undefined;
}

export interface IDepartmentMembership {
  departmentId: Types.ObjectId;
  roles: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Staff Role Interface
export interface IStaffRole extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILookup extends Document {
  _id: Types.ObjectId;
  type: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// DCV-050: Added features field for feature flags
export interface ISettings extends Document {
  _id: Types.ObjectId;
  scope: 'global';
  pagination: {
    defaultLimit: number;
    maxLimit: number;
    overrides?: Record<
      string,
      {
        limit?: number;
        maxLimit?: number;
      }
    >;
  };
  features?: Map<string, boolean>;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Department Master CSS Interface
export interface IDepartmentMasterCSS extends Document {
  _id: Types.ObjectId;
  departmentId: Types.ObjectId;
  css: string;
  version: number;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Master Template Interface
export interface IMasterTemplate extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  type: 'scorm' | 'custom' | 'hybrid';
  departmentId?: Types.ObjectId;
  isGlobal: boolean;
  css?: string;
  layout?: {
    grid?: string;
    regions: Array<{
      id: string;
      kind: 'scorm' | 'custom';
      title: string;
    }>;
  };
  score?: {
    value: number;
    comparedToVersion: number;
    passingStyleScore?: number;
    diffs: Array<{
      selector: string;
      property: string;
      expected?: string;
      actual?: string;
    }>;
  };
  overrideStatus: 'inherited' | 'pending' | 'approved';
  status: 'draft' | 'published' | 'archived';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Learner Interface
// Deprecated fields removed in migration: isGraduated, isPromoted*, currentClassLevel,
// classLevels, academicYear, yearGraduated, examResults, scormProgress.
// DCV-041: email removed - derive from User via getEmail()
// DCV-029: programEnrolmentStatuses removed - use ProgramEnrollment model
export interface ILearner extends IPerson {
  learnerId?: string;
  dateAdmitted?: Date;
  globalStatus: 'active' | 'inactive';
  // DCV-029: programEnrolmentStatuses removed
  // Program enrollment status is now tracked in ProgramEnrollment model
  createdBy?: Types.ObjectId;
  // DCV-041: Method to get email from User
  getEmail(): Promise<string | undefined>;
}

// Academic Year Interface
export interface IAcademicYear extends Document {
  _id: Types.ObjectId;
  name: string;
  fromYear: Date;
  toYear: Date;
  isCurrent: boolean;
  createdBy: Types.ObjectId;
  learners?: Types.ObjectId[];
  instructors?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Academic Term Interface
export interface IAcademicTerm extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  duration: string;
  academicYear: Types.ObjectId;
  createdBy: Types.ObjectId;
  archived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Program Interface
// DCV-013-015: Removed orphaned arrays (learners, instructors, courses)
// - learners: Derive from ProgramEnrollment
// - instructors: Derive from Course assignments via ProgramLevel
// - courses: Derive from ProgramLevel.courses or Course.find({ program })
// DCV-043: duration removed - tracked at Class level
export interface IProgram extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  code?: string;
  createdBy: Types.ObjectId;
  department: Types.ObjectId;
  archived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // DCV-018: Instance methods for backwards compatibility
  getLearners(): Promise<ILearner[]>;
  getInstructors(): Promise<IStaff[]>;
  getCourses(): Promise<ICourse[]>;
  getLearnerCount(): Promise<number>;
  getCourseCount(): Promise<number>;
}

// Program Level Interface
// DCV-044: department removed - inherit from Program via getDepartment()
export interface IProgramLevel extends Document {
  _id: Types.ObjectId;
  program: Types.ObjectId;
  name: string;
  description?: string;
  order: number;
  courses?: Types.ObjectId[];
  archived: boolean;
  archivedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // DCV-044: Method to get department from Program
  getDepartment(): Promise<Types.ObjectId | undefined>;
}

// DCV-026: Credential Goal enum
export type CredentialGoal = 'certificate' | 'degree' | 'none';

// DCV-026: Program Enrollment Status enum (expanded)
export type ProgramEnrollmentStatus = 'applied' | 'enrolled' | 'on-leave' | 'withdrawn' | 'completed';

// DCV-026: Completion Type enum
export type ProgramCompletionType = 'with-certificate' | 'with-degree' | 'coursework-only' | 'incomplete';

// DCV-026: Status History Entry
export interface IStatusHistoryEntry {
  status: ProgramEnrollmentStatus;
  reason?: string;
  changedBy?: Types.ObjectId;
  changedAt: Date;
}

// DCV-026: Program Enrollment Interface (Redesigned)
// Tracks learner enrollment lifecycle with credential goals
export interface IProgramEnrollment extends Document {
  _id: Types.ObjectId;
  learner: Types.ObjectId;
  program: Types.ObjectId;
  // DCV-026: Credential tracking
  credentialGoal: CredentialGoal;
  targetCredential?: Types.ObjectId;
  currentProgramLevel?: Types.ObjectId;
  // DCV-026: Expanded status
  status: ProgramEnrollmentStatus;
  statusHistory: IStatusHistoryEntry[];
  // Dates
  enrolledAt: Date;
  completedAt?: Date;
  withdrawnAt?: Date;
  // DCV-026: Leave tracking
  leaveReason?: string;
  leaveStartDate?: Date;
  expectedReturnDate?: Date;
  // DCV-026: Completion/withdrawal details
  completionType?: ProgramCompletionType;
  withdrawalReason?: string;
  withdrawnBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// DCV-027: Exam Attempt Interface
export interface IExamAttempt {
  examId: Types.ObjectId;
  examType?: 'quiz' | 'midterm' | 'final' | 'assignment' | 'practice';
  attemptNumber: number;
  points?: number;
  maxPoints?: number;
  percentage?: number;
  attemptedAt: Date;
  timeSpent?: number;
}

// DCV-027: Media Progress Interface
export interface IMediaProgress {
  mediaId: Types.ObjectId;
  viewedMinutes: number;
  requiredMinutes?: number;
  verified: boolean;
  lastViewedAt?: Date;
}

// DCV-027: SCORM Attempt Interface
export interface IScormAttempt {
  scormPackageId: Types.ObjectId;
  attemptNumber: number;
  score?: number;
  scaledScore?: number;
  completionStatus: 'unknown' | 'not-attempted' | 'incomplete' | 'completed';
  successStatus: 'unknown' | 'passed' | 'failed';
  attemptedAt: Date;
  timeSpent?: number;
}

// DCV-027: Course Progress Interface
export interface ICourseProgress {
  examAttempts?: IExamAttempt[];
  mediaProgress?: IMediaProgress[];
  scormAttempts?: IScormAttempt[];
}

// DCV-027: Course Enrollment Current Interface
// Tracks active course enrollments (temporary - deleted when course ends)
export interface ICourseEnrollmentCurrent extends Document {
  _id: Types.ObjectId;
  learner: Types.ObjectId;
  course: Types.ObjectId;
  programEnrollment: Types.ObjectId;
  enrolledAt: Date;
  progress: ICourseProgress;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// DCV-028: Course Outcome enum
export type CourseOutcome = 'passed' | 'failed' | 'withdrawn';

// DCV-028: Scoring Breakdown Interface
export interface IScoringBreakdown {
  points?: number;
  maxPoints?: number;
  percentage?: number;
  scaledScore?: number;
}

// DCV-028: Final Scoring Interface
export interface IFinalScoring {
  totalPoints?: number;
  maxPoints?: number;
  percentage?: number;
  exams?: IScoringBreakdown;
  media?: IScoringBreakdown;
  scorm?: IScoringBreakdown;
}

// DCV-028: Attempt History Interface
export interface IAttemptHistory {
  examAttempts?: IExamAttempt[];
  mediaProgress?: IMediaProgress[];
  scormAttempts?: IScormAttempt[];
}

// DCV-028: Course Enrollment Activity Interface
// Permanent record of completed/withdrawn course enrollments
export interface ICourseEnrollmentActivity extends Document {
  _id: Types.ObjectId;
  learner: Types.ObjectId;
  course: Types.ObjectId;
  programEnrollment: Types.ObjectId;
  outcome: CourseOutcome;
  enrolledAt?: Date;
  completedAt: Date;
  finalScoring?: IFinalScoring;
  attemptHistory?: IAttemptHistory;
  creditsEarned: number;
  visibleToLearner: boolean;
  withdrawalReason?: string;
  withdrawnBy?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Class Interface (cohort for a ProgramLevel)
// DCV-024: Class model definition with Calendar integration
export interface IClass extends Document {
  _id: Types.ObjectId;
  name: string;
  program: Types.ObjectId;
  programLevel: Types.ObjectId;
  department?: Types.ObjectId;
  // DCV-024: Calendar integration
  academicYear?: Types.ObjectId;
  academicTerm?: Types.ObjectId;
  instructors?: Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  // DCV-043: duration tracked at Class level (removed from Program)
  duration?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Class Enrollment Interface
export interface IClassEnrollment extends Document {
  _id: Types.ObjectId;
  learner: Types.ObjectId;
  class: Types.ObjectId;
  program: Types.ObjectId;
  programLevel: Types.ObjectId;
  enrolledAt: Date;
  completedAt?: Date;
  withdrawnAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Course Interface
// DCV-037: description removed - use shortDescription/longDescription
// DCV-035: Added defaultGradingPolicy
// DCV-044: department removed - inherit from Program via getDepartment()
export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  shortDescription?: string;
  longDescription?: string;
  program: Types.ObjectId;
  programLevel?: Types.ObjectId;
  isArchived: boolean;
  archivedAt?: Date;
  status?: 'draft' | 'rendered' | 'published';
  publishedAt?: Date;
  publishedBy?: Types.ObjectId;
  primaryInstructors?: Types.ObjectId[];
  secondaryInstructors?: Types.ObjectId[];
  createdBy: Types.ObjectId;
  defaultGradingPolicy?: IGradingPolicy;
  createdAt: Date;
  updatedAt: Date;
  
  // DCV-044: Method to get department from Program
  getDepartment(): Promise<Types.ObjectId | undefined>;
}

// Course Content Interface (unified content)
// DCV-045: Added title field for segment naming
export interface ICourseContent extends Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  title?: string;
  shortDescription?: string;
  longDescription?: string;
  contentType: 'scorm' | 'custom';
  scormPackageId?: Types.ObjectId;
  customContentId?: Types.ObjectId;
  order: number;
  isRequired: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Course Enrollment Interface
export interface ICourseEnrollment extends Document {
  _id: Types.ObjectId;
  learner: Types.ObjectId;
  course: Types.ObjectId;
  program: Types.ObjectId;
  programLevel?: Types.ObjectId;
  class?: Types.ObjectId;
  status: 'active' | 'completed' | 'withdrawn';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Content Attempt Interface (unified attempts)
export interface IContentAttempt extends Document {
  _id: Types.ObjectId;
  learner: Types.ObjectId;
  courseContent: Types.ObjectId;
  contentType: 'scorm' | 'custom';
  status: 'in_progress' | 'completed' | 'abandoned';
  score?: number;
  maxScore?: number;
  passed?: boolean;
  timeSpentSec?: number;
  payload?: any;
  customType?: 'exam' | 'quiz' | 'exercise' | 'scorm' | 'custom';
  scormAttemptId?: Types.ObjectId;
  startedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
  createdAt: Date;
}

// DCV-042: Department status type
export type DepartmentStatus = 'active' | 'archived';

// Department Interface
export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  code?: string;
  level: 'master' | 'top' | 'sub';
  parent?: Types.ObjectId | null;
  ancestors?: Types.ObjectId[];
  passingStyleScore?: number | null;
  status: DepartmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Year Group Interface
export interface IYearGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  academicYear: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Audit Interface
export interface IAudit extends Document {
  _id: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: string;
  reason?: string;
  before?: any;
  after?: any;
  context?: any;
  createdAt: Date;
}

// Grading Policy Types (DCV-033, DCV-034, DCV-035)
export type GradingPolicyType = 'final-attempt' | 'best-attempt' | 'average-all' | 'average-last-n';
export interface IGradingPolicy {
  type: GradingPolicyType;
  averageCount?: number; // Only used when type === 'average-last-n'
}

// Exam Interface
// DCV-033: Added gradingPolicy and maxAttempts
export interface IExam extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  course: Types.ObjectId;
  program: Types.ObjectId;
  programLevel?: Types.ObjectId;
  passMark: number;
  totalMark: number;
  academicTerm: Types.ObjectId;
  duration: string;
  examDate: Date;
  examTime: string;
  examType: string;
  examStatus: 'pending' | 'live' | 'completed';
  createdBy: Types.ObjectId;
  academicYear: Types.ObjectId;
  questions?: Types.ObjectId[];
  isPublished: boolean;
  gradingPolicy?: IGradingPolicy;
  maxAttempts?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Exam Result Interface
export interface IExamResult extends Document {
  _id: Types.ObjectId;
  learner: Types.ObjectId;
  exam: Types.ObjectId;
  grade: number;
  score: number;
  passMark: number;
  answeredQuestions?: Array<{
    question: Types.ObjectId;
    answer: string;
  }>;
  status: 'passed' | 'failed';
  remarks?: string;
  isPublished: boolean;
  academicTerm: Types.ObjectId;
  academicYear: Types.ObjectId;
  programLevel?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Question Interface
export interface IQuestion extends Document {
  _id: Types.ObjectId;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Token Blacklist Interface
export interface ITokenBlacklist extends Document {
  _id: Types.ObjectId;
  token: string;
  userId: Types.ObjectId;
  userType: UserRole;
  expiresAt: Date;
  reason: 'logout' | 'password_change' | 'token_refresh' | 'security_breach' | 'manual_revocation';
  createdAt: Date;
}

// Token Blacklist Model with static methods
export interface ITokenBlacklistModel extends Model<ITokenBlacklist> {
  isBlacklisted(token: string): Promise<boolean>;
  blacklistToken(
    token: string,
    userId: string | Types.ObjectId,
    userType: UserRole,
    reason?:
      | 'logout'
      | 'password_change'
      | 'token_refresh'
      | 'security_breach'
      | 'manual_revocation'
  ): Promise<ITokenBlacklist | null>;
  blacklistAllUserTokens(
    userId: string | Types.ObjectId,
    reason?:
      | 'logout'
      | 'password_change'
      | 'token_refresh'
      | 'security_breach'
      | 'manual_revocation'
  ): Promise<ITokenBlacklist>;
}

// Refresh Token Interface
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userType: UserRole;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  isRevoked: boolean;
  deviceInfo?: {
    userAgent?: string;
    ipAddress?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  markAsUsed(): Promise<void>;
  revoke(): Promise<void>;
}

// Refresh Token Model with static methods
export interface IRefreshTokenModel extends Model<IRefreshToken> {
  validateToken(token: string): Promise<IRefreshToken>;
  revokeAllUserTokens(userId: string): Promise<void>;
}

// Content: Custom content item
// DCV-046: 'scorm' removed from customType - use CourseContent.scormPackageId
// DCV-047: Added questions ref for quiz/exam types
export interface ICustomContent extends Document {
  _id: Types.ObjectId;
  title: string;
  customType: 'exam' | 'quiz' | 'exercise' | 'custom';
  payload?: any;
  html?: string;
  css?: string;
  department?: Types.ObjectId;
  questions?: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourseSegment {
  segmentId: string;
  type: 'scorm' | 'custom';
  contentId: Types.ObjectId;
}

// Note: ICourse interface is defined earlier in this file (line ~298)
// This duplicate has been removed to avoid TypeScript conflicts

// DCV-048: Added css and version fields
export interface IRenderedCourse extends Document {
  _id: Types.ObjectId;
  courseId: Types.ObjectId;
  contentVersion: Date;
  html: string;
  css?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILearnerProgress extends Document {
  _id: Types.ObjectId;
  learnerId: Types.ObjectId;
  courseId?: Types.ObjectId;
  contentId: Types.ObjectId;
  segmentId: string;
  contentType: 'scorm' | 'custom';
  customType?: 'exam' | 'quiz' | 'exercise' | 'scorm' | 'custom';
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  progressPercent: number;
  score: number;
  maxScore: number;
  passed?: boolean;
  attemptCount: number;
  timeSpentSec: number;
  lastActivityAt?: Date;
  payload?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContentAttempt extends Document {
  _id: Types.ObjectId;
  learnerId: Types.ObjectId;
  courseId?: Types.ObjectId;
  contentId: Types.ObjectId;
  segmentId: string;
  contentType: 'scorm' | 'custom';
  customType?: 'exam' | 'quiz' | 'exercise' | 'scorm' | 'custom';
  attemptNumber: number;
  startedAt: Date;
  submittedAt?: Date;
  status: 'in_progress' | 'completed' | 'failed';
  score?: number;
  maxScore?: number;
  passed?: boolean;
  timeSpentSec: number;
  payload?: any;
  createdAt: Date;
  updatedAt: Date;
}

// DCV-031: Credential types
export type CredentialType = 'certificate' | 'degree' | 'diploma';
export type CredentialStatus = 'draft' | 'active' | 'archived';

export interface ICredentialRequirement {
  description: string;
  minCredits?: number;
  minScore?: number;
  requiredCourses?: Types.ObjectId[];
}

export interface ICredential extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  type: CredentialType;
  program: Types.ObjectId;
  createdBy: Types.ObjectId;
  status: CredentialStatus;
  requirements?: ICredentialRequirement[];
  totalCreditsRequired?: number;
  validityMonths?: number;
  createdAt: Date;
  updatedAt: Date;
}

// DCV-051: Media types
export type MediaType = 'video' | 'audio' | 'document' | 'image' | 'embed';
export type MediaStatus = 'draft' | 'published' | 'archived';

export interface IMedia extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  type: MediaType;
  url: string;
  department: Types.ObjectId;
  createdBy: Types.ObjectId;
  status: MediaStatus;
  durationSeconds?: number;
  mimeType?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  embedCode?: string;
  provider?: string;
  providerId?: string;
  createdAt: Date;
  updatedAt: Date;
}
