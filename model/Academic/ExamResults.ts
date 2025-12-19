import mongoose, { Schema } from 'mongoose';
import { IExamResult } from '../../types/models';

/**
 * Exam Result Schema
 * Represents exam results for students
 */
const examResultSchema = new Schema<IExamResult>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    exam: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    grade: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      required: true,
    },
    passMark: {
      type: Number,
      required: true,
      default: 30,
    },
    answeredQuestions: [
      {
        type: Object,
      },
    ],
    // failed/passed
    status: {
      type: String,
      required: true,
      enum: ['failed', 'passed'],
      default: 'failed',
    },
    // Excellent/Good/Poor
    remarks: {
      type: String,
      required: true,
      enum: ['Excellent!', 'Very Good', 'Good', 'Fair', 'Needs Improvement'],
      default: 'Fair',
    },
    classLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ClassLevel',
    },
    academicTerm: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicTerm',
      required: true,
    },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
examResultSchema.index({ student: 1 });
examResultSchema.index({ exam: 1 });
examResultSchema.index({ academicYear: 1 });
examResultSchema.index({ academicTerm: 1 });
examResultSchema.index({ classLevel: 1 });
examResultSchema.index({ status: 1 });
examResultSchema.index({ isPublished: 1 });
examResultSchema.index({ createdAt: -1 });
// Compound indexes for common queries
examResultSchema.index({ student: 1, academicYear: 1 });
examResultSchema.index({ student: 1, exam: 1 }, { unique: true });
examResultSchema.index({ exam: 1, status: 1 });
examResultSchema.index({ academicYear: 1, academicTerm: 1, classLevel: 1 });
examResultSchema.index({ isPublished: 1, createdAt: -1 });

const ExamResult = mongoose.model<IExamResult>('ExamResult', examResultSchema);

export default ExamResult;
