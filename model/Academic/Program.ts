import mongoose, { Schema } from 'mongoose';
import { IProgram } from '../../types/models-types';

/**
 * Program Schema
 * Represents academic programs in the system
 */
const programSchema = new Schema<IProgram>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
      required: true,
      default: '4 years',
    },
    // Created automatically - CSFTY
    code: {
      type: String,
      default: function (this: IProgram) {
        return (
          this.name
            .split(' ')
            .map((name) => name[0])
            .join('')
            .toUpperCase() +
          Math.floor(10 + Math.random() * 90) +
          Math.floor(10 + Math.random() * 90)
        );
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    // Instructors that are in charge of the program
    instructors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
      },
    ],
    learners: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Learner',
        default: [],
      },
    ],
    // Courses that are in the program
    courses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Course',
        default: [],
      },
    ],
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Program = mongoose.model<IProgram>('Program', programSchema);

export default Program;
