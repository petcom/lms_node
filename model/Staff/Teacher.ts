import mongoose, { Schema } from 'mongoose';
import { ITeacher } from '../../types/models';

/**
 * Teacher Schema
 * Represents teachers in the LMS system
 */
const teacherSchema = new Schema<ITeacher>(
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
    dateEmployed: {
      type: Date,
      default: Date.now,
    },
    // Randomizes a number between 1 and 999 to make the id unique for each teacher
    teacherId: {
      type: String,
      required: true,
      default: function (this: ITeacher) {
        return (
          'TEA' +
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
    // If withdrawn, the teacher will not be able to login
    isWithdrawn: {
      type: Boolean,
      default: false,
    },
    // If suspended, the teacher can login but cannot perform any task
    isSuspended: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: 'teacher',
    },
    subject: {
      type: String,
    },
    // When you are registered, teacher goes through approval stage
    applicationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    program: {
      type: String,
    },
    // A teacher can teach in more than one class level
    classLevel: {
      type: String,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    academicYear: {
      type: String,
    },
    examsCreated: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Exam',
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

// Indexes for query performance
teacherSchema.index({ email: 1 }, { unique: true });
teacherSchema.index({ teacherId: 1 }, { unique: true });
teacherSchema.index({ subject: 1 });
teacherSchema.index({ classLevel: 1 });
teacherSchema.index({ applicationStatus: 1 });
teacherSchema.index({ isSuspended: 1 });
teacherSchema.index({ isWithdrawn: 1 });
teacherSchema.index({ createdAt: -1 });
// Compound indexes for common queries
teacherSchema.index({ subject: 1, classLevel: 1 });
teacherSchema.index({ applicationStatus: 1, createdAt: -1 });

// Model
const Teacher = mongoose.model<ITeacher>('Teacher', teacherSchema);

export default Teacher;
