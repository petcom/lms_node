import mongoose, { Schema } from 'mongoose';
import { IClass } from '../../types/models-types';

/**
 * Class Schema
 * Represents a cohort of learners moving through a program level together.
 * 
 * DCV-024: Class model definition and Calendar integration
 * - A Class is a group of students attending a program at the same time
 * - Classes exist within AcademicTerms which are part of AcademicYears
 * - Staff.academicYear was removed (DCV-023) - context comes from Class assignment
 * 
 * Calendar Integration:
 * - academicYear: The academic year this class runs in
 * - academicTerm: The specific term (optional, for term-based programs)
 * - startDate/endDate: Actual class dates (may differ from term dates)
 */
const classSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: true,
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    programLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramLevel',
      required: true,
      index: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    // DCV-024: Calendar integration fields
    academicYear: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicYear',
      index: true,
    },
    academicTerm: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicTerm',
      index: true,
    },
    instructors: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Staff',
      },
    ],
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    // Duration is tracked at Class level (DCV-043: removed from Program)
    duration: {
      type: String,
    },
    // DCV-053: createdBy references User (shared _id pattern)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

classSchema.index({ program: 1, programLevel: 1, createdAt: -1 });
classSchema.index({ department: 1, createdAt: -1 });
// DCV-024: Calendar-based indexes
classSchema.index({ academicYear: 1, academicTerm: 1 });

const ClassModel = mongoose.model<IClass>('Class', classSchema);

export default ClassModel;
