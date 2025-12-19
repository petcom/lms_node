import mongoose, { Schema } from 'mongoose';
import { IProgram } from '../../types/models';

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
    // Teachers that are in charge of the program
    teachers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
      },
    ],
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        default: [],
      },
    ],
    // Subjects that are in the program
    subjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        default: [],
      },
    ],
  },
  { timestamps: true }
);

const Program = mongoose.model<IProgram>('Program', programSchema);

export default Program;
