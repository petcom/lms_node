import mongoose, { Schema } from 'mongoose';
import { IDepartmentMasterCSS } from '../../types/models-types';

const departmentMasterCssSchema = new Schema<IDepartmentMasterCSS>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      unique: true,
      index: true,
    },
    css: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

const DepartmentMasterCSS = mongoose.model<IDepartmentMasterCSS>(
  'DepartmentMasterCSS',
  departmentMasterCssSchema
);

export default DepartmentMasterCSS;
