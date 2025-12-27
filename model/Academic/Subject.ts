import mongoose, { Schema } from 'mongoose';
import { ISubject } from '../../types/models';

/**
 * Subject Schema
 * Represents academic subjects in the system
 */
const subjectSchema = new Schema<ISubject>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    duration: {
      type: String,
      required: true,
      default: '3 months',
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
    },
    teachers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
      },
    ],
  },
  { timestamps: true }
);

const Subject = mongoose.model<ISubject>('Subject', subjectSchema);

export default Subject;
