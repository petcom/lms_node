import mongoose, { Schema } from 'mongoose';
import { IExam } from '../../types/models';

/**
 * Exam Schema
 * Represents exams in the system
 */
const examSchema = new Schema<IExam>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
    },
    passMark: {
      type: Number,
      required: true,
      default: 30,
    },
    totalMark: {
      type: Number,
      required: true,
      default: 100,
    },
    academicTerm: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicTerm',
      required: true,
    },
    duration: {
      type: String,
      required: true,
      default: '30 minutes',
    },
    examDate: {
      type: Date,
      required: true,
      default: new Date(),
    },
    examTime: {
      type: String,
      required: true,
    },
    examType: {
      type: String,
      required: true,
      default: 'quiz',
    },
    examStatus: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'live'],
    },
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    programLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramLevel',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
    },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for query performance
examSchema.index({ course: 1 });
examSchema.index({ program: 1 });
examSchema.index({ programLevel: 1 });
examSchema.index({ academicTerm: 1 });
examSchema.index({ academicYear: 1 });
examSchema.index({ examStatus: 1 });
examSchema.index({ examDate: -1 });
examSchema.index({ createdBy: 1 });
// Compound indexes for common queries
examSchema.index({ course: 1, programLevel: 1, academicTerm: 1 });
examSchema.index({ examStatus: 1, examDate: -1 });
examSchema.index({ program: 1, academicYear: 1 });

const Exam = mongoose.model<IExam>('Exam', examSchema);

export default Exam;
