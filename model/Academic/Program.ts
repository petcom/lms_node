import mongoose, { Schema } from 'mongoose';
import { IProgram } from '../../types/models-types';

/**
 * Program Schema
 * Represents academic programs in the system
 * DCV-043: duration removed - tracked at Class level
 */
const programSchema = new Schema<IProgram>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    // DCV-043: duration removed - tracked at Class level
    // Created automatically - CSFTY
    code: {
      type: String,
      default: function (this: IProgram) {
        return (
          this.name
            .split(' ')
            .map((name) => name[0])
            .join('')
            .toUpperCase() +
          Math.floor(10 + Math.random() * 90) +
          Math.floor(10 + Math.random() * 90)
        );
      },
    },
    // DCV-053: createdBy references User (shared _id pattern)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    // DCV-013, DCV-014, DCV-015: Removed orphaned arrays
    // - learners: Derive from ProgramEnrollment.find({ program: programId })
    // - instructors: Derive from Course.primaryInstructors/secondaryInstructors via ProgramLevel
    // - courses: Derive from ProgramLevel.courses or Course.find({ program: programId })
    archived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archivedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// DCV-018: Instance methods for backwards compatibility
// These replace the removed orphaned arrays with derived queries
import { getProgramQueryService } from '../../services/programQueryService';

programSchema.methods.getLearners = async function() {
  const service = getProgramQueryService();
  return service.getLearners(this._id.toString());
};

programSchema.methods.getInstructors = async function() {
  const service = getProgramQueryService();
  return service.getInstructors(this._id.toString());
};

programSchema.methods.getCourses = async function() {
  const service = getProgramQueryService();
  return service.getCourses(this._id.toString());
};

programSchema.methods.getLearnerCount = async function() {
  const service = getProgramQueryService();
  return service.getLearnerCount(this._id.toString());
};

programSchema.methods.getCourseCount = async function() {
  const service = getProgramQueryService();
  return service.getCourseCount(this._id.toString());
};

const Program = mongoose.model<IProgram>('Program', programSchema);

export default Program;
