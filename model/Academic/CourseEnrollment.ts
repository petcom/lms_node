import mongoose, { Schema } from 'mongoose';
import { ICourseEnrollment } from '../../types/models';

/**
 * Course Enrollment Schema
 * Tracks learner progress within a course.
 */
const courseEnrollmentSchema = new Schema<ICourseEnrollment>(
  {
    learner: {
      type: Schema.Types.ObjectId,
      ref: 'Learner',
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    programLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramLevel',
      index: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'withdrawn'],
      default: 'active',
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

courseEnrollmentSchema.index({ learner: 1, course: 1 }, { unique: true });
courseEnrollmentSchema.index({ program: 1, status: 1 });

const CourseEnrollment = mongoose.model<ICourseEnrollment>(
  'CourseEnrollment',
  courseEnrollmentSchema
);

export default CourseEnrollment;
