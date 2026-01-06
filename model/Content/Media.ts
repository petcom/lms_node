import mongoose, { Schema } from 'mongoose';
import { IMedia } from '../../types/models-types';

/**
 * Media Schema
 * DCV-051: External hosted content (video, audio, documents, etc.)
 * 
 * Unlike SCORM packages, Media represents externally hosted content
 * that can be referenced in courses. This allows for:
 * - Embedded YouTube/Vimeo videos
 * - Audio podcasts
 * - PDF documents
 * - Image galleries
 * - Other embed content
 */

const mediaSchema = new Schema<IMedia>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ['video', 'audio', 'document', 'image', 'embed'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    // DCV-053: createdBy references User (shared _id pattern)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    // Optional metadata
    durationSeconds: {
      type: Number,
    },
    mimeType: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    thumbnailUrl: {
      type: String,
    },
    // For embed content
    embedCode: {
      type: String,
    },
    // Provider metadata (YouTube, Vimeo, etc.)
    provider: {
      type: String,
    },
    providerId: {
      type: String,
    },
  },
  { timestamps: true }
);

// Indexes
mediaSchema.index({ department: 1, type: 1 });
mediaSchema.index({ department: 1, status: 1 });
mediaSchema.index({ createdBy: 1 });

const Media = mongoose.model<IMedia>('Media', mediaSchema);

export default Media;
