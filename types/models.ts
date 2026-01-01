// Mongoose document type definitions
import { Document, Types, Model } from 'mongoose';

// User role types
export type UserRole = 'admin' | 'staff' | 'student';

// Admin Interface
export interface IAdmin extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin';
  department?: Types.ObjectId;
  academicYears?: Types.ObjectId[];
  academicTerms?: Types.ObjectId[];
  programs?: Types.ObjectId[];
  yearGroups?: Types.ObjectId[];
  teachers?: Types.ObjectId[];
  students?: Types.ObjectId[];
  classLevels?: Types.ObjectId[];
  subjects?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Staff Interface
export interface IStaff extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  dateEmployed?: Date;
  teacherId?: string;
  isWithdrawn: boolean;
  isSuspended: boolean;
  role: 'staff';
  roles?: string[];
  subject?: Types.ObjectId;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  program?: Types.ObjectId;
  classLevel?: Types.ObjectId;
  academicYear?: Types.ObjectId;
  examsCreated?: Types.ObjectId[];
  department?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Staff Role Interface
export interface IStaffRole extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
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

// Student Interface
export interface IStudent extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  studentId?: string;
  role: 'student';
  dateAdmitted?: Date;
  isSuspended: boolean;
  isWithdrawn: boolean;
  isGraduated: boolean;
  isPromotedToLevel200: boolean;
  isPromotedToLevel300: boolean;
  isPromotedToLevel400: boolean;
  academicYear?: Types.ObjectId;
  program?: Types.ObjectId;
  classLevels: string[];
  currentClassLevel?: string;
  prefectName?: string;
  yearGraduated?: Date;
  examResults?: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  // SCORM Progress Tracking
  scormProgress?: {
    enrolledPackages: Types.ObjectId[]; // ScormPackage IDs
    totalAttempts: number;
    completedPackages: number;
    averageScore?: number;
    totalTimeSpent: number; // Total seconds across all packages
    lastAccessedPackage?: Types.ObjectId;
    lastAccessedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Academic Year Interface
export interface IAcademicYear extends Document {
  _id: Types.ObjectId;
  name: string;
  fromYear: Date;
  toYear: Date;
  isCurrent: boolean;
  createdBy: Types.ObjectId;
  students?: Types.ObjectId[];
  teachers?: Types.ObjectId[];
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

// Class Level Interface
export interface IClassLevel extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdBy: Types.ObjectId;
  department?: Types.ObjectId;
  students?: Types.ObjectId[];
  subjects?: Types.ObjectId[];
  teachers?: Types.ObjectId[];
  archived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Program Interface
export interface IProgram extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  duration: string;
  code?: string;
  createdBy: Types.ObjectId;
  department?: Types.ObjectId;
  teachers?: Types.ObjectId[];
  students?: Types.ObjectId[];
  subjects?: Types.ObjectId[];
  archived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Subject Interface
export interface ISubject extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  academicYear: Types.ObjectId;
  createdBy: Types.ObjectId;
  duration: string;
  program?: Types.ObjectId;
  teachers?: Types.ObjectId[];
  department?: Types.ObjectId;
  archived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Department Interface
export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  code?: string;
  level: 'master' | 'top' | 'sub';
  parent?: Types.ObjectId | null;
  ancestors?: Types.ObjectId[];
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

// Exam Interface
export interface IExam extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  subject: Types.ObjectId;
  program: Types.ObjectId;
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
  classLevel: Types.ObjectId;
  questions?: Types.ObjectId[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Exam Result Interface
export interface IExamResult extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
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
  classLevel: Types.ObjectId;
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
export interface ICustomContent extends Document {
  _id: Types.ObjectId;
  title: string;
  customType: 'exam' | 'quiz' | 'practice' | 'other';
  payload?: any;
  html?: string;
  css?: string;
  department?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourseSegment {
  segmentId: string;
  type: 'scorm' | 'custom';
  contentId: Types.ObjectId;
}

export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  department?: Types.ObjectId;
  segments: ICourseSegment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRenderedCourse extends Document {
  _id: Types.ObjectId;
  courseId: Types.ObjectId;
  contentVersion: Date;
  html: string;
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
  customType?: 'exam' | 'quiz' | 'practice' | 'other';
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
  customType?: 'exam' | 'quiz' | 'practice' | 'other';
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
