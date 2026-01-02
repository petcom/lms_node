import mongoose, { Schema } from 'mongoose';
import { ILookup } from '../../types/models-types';

/**
 * Lookup Schema
 * Stores valid values for person honor fields (sex, gender, pronouns, honorific).
 */
const lookupSchema = new Schema<ILookup>(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

lookupSchema.index({ type: 1, value: 1 }, { unique: true });

const Lookup = mongoose.model<ILookup>('Lookup', lookupSchema, 'lookups');

export default Lookup;
