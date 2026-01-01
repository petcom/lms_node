import mongoose, { Schema } from 'mongoose';
import { IMasterTemplate } from '../../types/models';

const templateRegionSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    kind: {
      type: String,
      enum: ['scorm', 'custom'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const masterTemplateSchema = new Schema<IMasterTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['scorm', 'custom', 'hybrid'],
      required: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
      index: true,
    },
    css: {
      type: String,
      default: '',
    },
    layout: {
      grid: {
        type: String,
        default: '',
      },
      regions: {
        type: [templateRegionSchema],
        default: [],
      },
    },
    score: {
      value: {
        type: Number,
        default: 0,
      },
      comparedToVersion: {
        type: Number,
        default: 0,
      },
      diffs: {
        type: [
          {
            selector: String,
            property: String,
            expected: String,
            actual: String,
          },
        ],
        default: [],
      },
    },
    overrideStatus: {
      type: String,
      enum: ['inherited', 'pending', 'approved'],
      default: 'inherited',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
  },
  { timestamps: true }
);

masterTemplateSchema.index({ departmentId: 1, status: 1 });
masterTemplateSchema.index({ departmentId: 1, type: 1 });

const MasterTemplate = mongoose.model<IMasterTemplate>('MasterTemplate', masterTemplateSchema);

export default MasterTemplate;
