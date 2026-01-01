import mongoose, { Schema } from 'mongoose';
import { IDepartment } from '../../types/models';

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      unique: true,
      sparse: true,
    },
    level: {
      type: String,
      required: true,
      enum: ['master', 'top', 'sub'],
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    ancestors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    passingStyleScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

departmentSchema.index({ level: 1 });
departmentSchema.index({ parent: 1 });
departmentSchema.index({ name: 1, parent: 1 }, { unique: true });

const Department = mongoose.model<IDepartment>('Department', departmentSchema);

export default Department;
