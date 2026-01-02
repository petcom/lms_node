import mongoose, { Schema } from 'mongoose';
import { IYearGroup } from '../../types/models-types';

/**
 * Year Group Schema
 * Represents year groups in the system
 */
const yearGroupSchema = new Schema<IYearGroup>(
  {
    name: {
      type: String,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
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

const YearGroup = mongoose.model<IYearGroup>('YearGroup', yearGroupSchema);

export default YearGroup;
