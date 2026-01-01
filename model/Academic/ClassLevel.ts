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
    // Learners will be added to the class level when they are registered
    learners: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Learner',
      },
    ],
    subjects: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    instructors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
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

const ClassLevel = mongoose.model<IClassLevel>('ClassLevel', classLevelSchema);

export default ClassLevel;
