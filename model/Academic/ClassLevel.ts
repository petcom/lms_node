import mongoose, { Schema } from 'mongoose';
import { IClassLevel } from '../../types/models';

/**
 * Class Level Schema
 * Represents class levels (Level 100/200/300/400) in the system
 */
const classLevelSchema = new Schema<IClassLevel>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    // Students will be added to the class level when they are registered
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    subjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    teachers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
      },
    ],
  },
  { timestamps: true }
);

const ClassLevel = mongoose.model<IClassLevel>('ClassLevel', classLevelSchema);

export default ClassLevel;
