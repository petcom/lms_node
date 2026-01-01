import mongoose, { Schema } from 'mongoose';
import { ICustomContent } from '../../types/models';

const customContentSchema = new Schema<ICustomContent>(
  {
    title: {
      type: String,
      required: true,
    },
    customType: {
      type: String,
      required: true,
      enum: ['exam', 'quiz', 'practice', 'other'],
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
    html: {
      type: String,
    },
    css: {
      type: String,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
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

customContentSchema.index({ title: 1 });

const CustomContent = mongoose.model<ICustomContent>('CustomContent', customContentSchema);

export default CustomContent;
