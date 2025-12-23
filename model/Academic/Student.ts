import mongoose, { Schema } from 'mongoose';
import { IStudent } from '../../types/models';

/**
 * Student Schema
 * Represents students in the LMS system
 */
const studentSchema = new Schema<IStudent>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    studentId: {
      type: String,
      required: true,
      default: function (this: IStudent) {
        return (
          'STU' +
          Math.floor(100 + Math.random() * 900) +
          Date.now().toString().slice(2, 4) +
          this.name
            .split(' ')
            .map((name) => name[0])
            .join('')
            .toUpperCase()
        );
      },
    },
    role: {
      type: String,
      default: 'student',
    },
    /**
     * Classes are from level 1 to 6
     * Keep track of the class level
     * the student is in
     */
    classLevels: [
      {
        type: String,
      },
    ],
    currentClassLevel: {
      type: String,
      default: function (this: IStudent) {
        return this.classLevels[this.classLevels.length - 1];
      },
    },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
    },
    dateAdmitted: {
      type: Date,
      default: Date.now,
    },
    examResults: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ExamResult',
      },
    ],
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
    },
    isPromotedToLevel200: {
      type: Boolean,
      default: false,
    },
    isPromotedToLevel300: {
      type: Boolean,
      default: false,
    },
    isPromotedToLevel400: {
      type: Boolean,
      default: false,
    },
    isGraduated: {
      type: Boolean,
      default: false,
    },
    isWithdrawn: {
      type: Boolean,
      default: false,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    prefectName: {
      type: String,
    },
    yearGraduated: {
      type: Date,
    },
    // SCORM Progress Tracking
    scormProgress: {
      enrolledPackages: [
        {
          type: Schema.Types.ObjectId,
          ref: 'ScormPackage',
        },
      ],
      totalAttempts: {
        type: Number,
        default: 0,
      },
      completedPackages: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      totalTimeSpent: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastAccessedPackage: {
        type: Schema.Types.ObjectId,
        ref: 'ScormPackage',
      },
      lastAccessedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for query performance
studentSchema.index({ email: 1 }, { unique: true });
studentSchema.index({ studentId: 1 }, { unique: true });
studentSchema.index({ currentClassLevel: 1 });
studentSchema.index({ academicYear: 1 });
studentSchema.index({ program: 1 });
studentSchema.index({ isGraduated: 1 });
studentSchema.index({ isSuspended: 1 });
studentSchema.index({ createdAt: -1 });
// Compound index for common queries
studentSchema.index({ academicYear: 1, currentClassLevel: 1 });
studentSchema.index({ program: 1, currentClassLevel: 1 });
// SCORM-specific indexes
studentSchema.index({ 'scormProgress.enrolledPackages': 1 });
studentSchema.index({ 'scormProgress.lastAccessedAt': -1 });

// Model
const Student = mongoose.model<IStudent>('Student', studentSchema);

export default Student;
