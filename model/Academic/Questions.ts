import mongoose, { Schema } from 'mongoose';
import { IQuestion } from '../../types/models-types';

/**
 * Question Schema
 * Represents exam questions
 */
const questionSchema = new Schema<IQuestion>(
  {
    question: {
      type: String,
      required: true,
    },
    optionA: {
      type: String,
      required: true,
    },
    optionB: {
      type: String,
      required: true,
    },
    optionC: {
      type: String,
      required: true,
    },
    optionD: {
      type: String,
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
      enum: ['A', 'B', 'C', 'D'],
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    // DCV-053: createdBy references User (shared _id pattern)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Question = mongoose.model<IQuestion>('Question', questionSchema);

export default Question;
