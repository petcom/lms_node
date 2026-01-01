import mongoose, { Schema } from 'mongoose';
import { ICourse } from '../../types/models';

const courseSegmentSchema = new Schema(
  {
    segmentId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['scorm', 'custom'],
    },
    contentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false }
);

const courseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    segments: {
      type: [courseSegmentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;
