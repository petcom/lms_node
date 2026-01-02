import mongoose, { Schema } from 'mongoose';
import { IClass } from '../../types/models-types';

/**
 * Class Schema
 * Represents a cohort of learners moving through a program level together.
 */
const classSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: true,
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
      required: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    instructors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
      },
    ],
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

classSchema.index({ program: 1, programLevel: 1, createdAt: -1 });
classSchema.index({ department: 1, createdAt: -1 });

const ClassModel = mongoose.model<IClass>('Class', classSchema);

export default ClassModel;
