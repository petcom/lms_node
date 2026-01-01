import mongoose, { Schema } from 'mongoose';
import { IRenderedCourse } from '../../types/models';

const renderedCourseSchema = new Schema<IRenderedCourse>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    contentVersion: {
      type: Date,
      required: true,
    },
    html: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const RenderedCourse = mongoose.model<IRenderedCourse>(
  'RenderedCourse',
  renderedCourseSchema
);

export default RenderedCourse;
