// Mongoose document type definitions
import { Document, Types, Model } from 'mongoose';

// User role types
export type UserRole = 'global-admin' | 'staff' | 'learner';

export interface IPersonName {
  first: string;
  middle?: string;
  last: string;
  display?: string;
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
  createdAt: Date;
  updatedAt: Date;
}

// Admin Interface
export interface IAdmin extends IPerson {
  password: string;
  role: 'global-admin';
  department?: Types.ObjectId;
  academicYears?: Types.ObjectId[];
  academicTerms?: Types.ObjectId[];
  programs?: Types.ObjectId[];
  yearGroups?: Types.ObjectId[];
  instructors?: Types.ObjectId[];
  learners?: Types.ObjectId[];
  programLevels?: Types.ObjectId[];
  courses?: Types.ObjectId[];
}

// Staff Interface
export interface IStaff extends IPerson {
  password: string;
  dateEmployed?: Date;
  instructorId?: string;
  isWithdrawn: boolean;
  isSuspended: boolean;
  role: 'staff';
  roles?: string[];
  course?: Types.ObjectId;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  program?: Types.ObjectId;
  programLevel?: Types.ObjectId;
  academicYear?: Types.ObjectId;
  examsCreated?: Types.ObjectId[];
  department?: Types.ObjectId;
  createdBy?: Types.ObjectId;
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
export interface ILearner extends IPerson {
  password: string;
  learnerId?: string;
  role: 'learner';
  globalStatus: 'active' | 'inactive';
  isSuspended: boolean;
  isWithdrawn: boolean;
  createdBy?: Types.ObjectId;
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
export interface IProgram extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  duration: string;
  code?: string;
  createdBy: Types.ObjectId;
  department: Types.ObjectId;
  instructors?: Types.ObjectId[];
  learners?: Types.ObjectId[];
  courses?: Types.ObjectId[];
  archived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Program Level Interface
export interface IProgramLevel extends Document {
  _id: Types.ObjectId;
  program: Types.ObjectId;
  name: string;
  description?: string;
  order: number;
  department?: Types.ObjectId;
  archived: boolean;
  archivedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Program Enrollment Interface
export interface IProgramEnrollment extends Document {
  _id: Types.ObjectId;
  learner: Types.ObjectId;
  program: Types.ObjectId;
  status: 'active' | 'completed' | 'withdrawn';
  enrolledAt: Date;
  completedAt?: Date;
  withdrawnAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Class Interface (cohort for a ProgramLevel)
export interface IClass extends Document {
  _id: Types.ObjectId;
  name: string;
  program: Types.ObjectId;
  programLevel: Types.ObjectId;
  department?: Types.ObjectId;
  instructors?: Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
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
export interface ICourse extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  program: Types.ObjectId;
  programLevel?: Types.ObjectId;
  department?: Types.ObjectId;
  isArchived: boolean;
  archivedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Course Content Interface (unified content)
export interface ICourseContent extends Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
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
  customType?: 'exam' | 'quiz' | 'practice' | 'other';
  scormAttemptId?: Types.ObjectId;
  startedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
  createdAt: Date;
}

// Department Interface
export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  code?: string;
  level: 'master' | 'top' | 'sub';
  parent?: Types.ObjectId | null;
  ancestors?: Types.ObjectId[];
  passingStyleScore?: number | null;
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
