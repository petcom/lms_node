import mongoose, { Schema } from 'mongoose';
import { ISettings } from '../../types/models-types';

const paginationOverrideSchema = new Schema(
  {
    limit: { type: Number },
    maxLimit: { type: Number },
  },
  { _id: false }
);

const settingsSchema = new Schema<ISettings>(
  {
    scope: {
      type: String,
      enum: ['global'],
      default: 'global',
      unique: true,
      required: true,
    },
    pagination: {
      defaultLimit: { type: Number, default: 10 },
      maxLimit: { type: Number, default: 100 },
      overrides: {
        type: Map,
        of: paginationOverrideSchema,
        default: undefined,
      },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
    },
  },
  { timestamps: true }
);

const Settings = mongoose.model<ISettings>('Settings', settingsSchema);

export default Settings;
