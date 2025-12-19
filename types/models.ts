// Mongoose document type definitions
import { Document, Types, Model } from 'mongoose';

// User role types
export type UserRole = 'admin' | 'teacher' | 'student';

// Admin Interface
export interface IAdmin extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin';
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

// Teacher Interface
export interface ITeacher extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  dateEmployed?: Date;
  teacherId?: string;
  isWithdrawn: boolean;
  isSuspended: boolean;
  role: 'teacher';
  subject?: Types.ObjectId;
  applicationStatus: 'pending' | 'approved' | 'rejected';
  program?: Types.ObjectId;
  classLevel?: Types.ObjectId;
  academicYear?: Types.ObjectId;
  examsCreated?: Types.ObjectId[];
  createdBy?: Types.ObjectId;
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
  academicYear?: Types.ObjectId;
  program?: Types.ObjectId;
  classLevel?: Types.ObjectId;
  currentClassLevel?: Types.ObjectId;
  prefectName?: string;
  yearGraduated?: string;
  examResults?: Types.ObjectId[];
  createdBy?: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

// Class Level Interface
export interface IClassLevel extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdBy: Types.ObjectId;
  students?: Types.ObjectId[];
  subjects?: Types.ObjectId[];
  teachers?: Types.ObjectId[];
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
  teachers?: Types.ObjectId[];
  students?: Types.ObjectId[];
  subjects?: Types.ObjectId[];
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
  duration: number;
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
  studentID: Types.ObjectId;
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
