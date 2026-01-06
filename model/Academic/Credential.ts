import mongoose, { Schema } from 'mongoose';
import { ICredential } from '../../types/models-types';

/**
 * Credential Schema
 * DCV-031: Represents credentials (certificates, degrees, diplomas) that learners can earn
 * 
 * Referenced by:
 * - ProgramEnrollment.targetCredential
 * 
 * Credential types:
 * - certificate: Professional certificate
 * - degree: Academic degree (BA, MA, PhD, etc.)
 * - diploma: Diploma credential
 */

// Credential requirement subdocument schema
const credentialRequirementSchema = new Schema({
  description: {
    type: String,
    required: true,
  },
  minCredits: {
    type: Number,
  },
  minScore: {
    type: Number,
  },
  requiredCourses: [{
    type: Schema.Types.ObjectId,
    ref: 'Course',
  }],
}, { _id: false });

const credentialSchema = new Schema<ICredential>(
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
      enum: ['certificate', 'degree', 'diploma'],
      required: true,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
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
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
    requirements: [credentialRequirementSchema],
    // Credit requirements
    totalCreditsRequired: {
      type: Number,
    },
    // Validity period (for certificates that expire)
    validityMonths: {
      type: Number,
    },
  },
  { timestamps: true }
);

// Indexes
credentialSchema.index({ program: 1, type: 1 });
credentialSchema.index({ status: 1 });

const Credential = mongoose.model<ICredential>('Credential', credentialSchema);

export default Credential;
