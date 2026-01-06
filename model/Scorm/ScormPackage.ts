import mongoose, { Schema, Model } from 'mongoose';
import { IScormPackage } from '../../types/scorm-types';

/**
 * SCORM Package Schema
 * Stores metadata and configuration for SCORM content packages
 */
const scormPackageSchema = new Schema<IScormPackage>(
  {
    // Identification
    packageId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    version: {
      type: String,
      required: true,
      enum: ['scorm_1.2', 'scorm_2004'],
    },

    // File Information
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    filePath: {
      type: String,
      required: true,
    },

    // Manifest Data
    manifestData: {
      identifier: { type: String, required: true },
      version: {
        type: String,
        required: true,
        enum: ['scorm_1.2', 'scorm_2004'],
      },
      organizations: [
        {
          identifier: String,
          title: String,
          structure: String,
          items: [Schema.Types.Mixed],
        },
      ],
      // Allow flexible resource shapes parsed from manifests
      resources: [Schema.Types.Mixed],
      metadata: {
        schemaVersion: String,
        title: String,
        description: String,
        keywords: [String],
        duration: String,
        language: String,
        copyright: String,
      },
    },

    // Launch Information
    launchUrl: {
      type: String,
      required: true,
    },
    entryPoint: {
      type: String,
      required: true,
    },

    // Academic Integration
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
    },
    programLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ProgramLevel',
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      index: true,
    },
    academicTerm: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicTerm',
    },

    // Assignment/Grading
    isGraded: {
      type: Boolean,
      required: true,
      default: true,
    },
    passingScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    maxScore: {
      type: Number,
      required: true,
      default: 100,
    },
    weight: {
      type: Number,
      min: 0,
      max: 100,
    },
    dueDate: {
      type: Date,
    },
    // DCV-034: Grading policy for determining final score
    gradingPolicy: {
      type: {
        type: String,
        enum: ['final-attempt', 'best-attempt', 'average-all', 'average-last-n'],
        default: 'final-attempt',
      },
      averageCount: Number, // Only used when type === 'average-last-n'
    },
    // DCV-034: Maximum attempts allowed (null = unlimited)
    maxAttempts: {
      type: Number,
      default: null,
    },

    // Access Control
    // DCV-053: createdBy references User (shared _id pattern)
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      refPath: 'uploadedByModel',
      index: true,
    },
    uploadedByModel: {
      type: String,
      enum: ['Admin', 'Staff', 'Instructor', 'Learner'],
      default: 'Staff',
    },
    assignedTo: {
      learners: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Learner',
        },
      ],
      classes: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Class',
        },
      ],
      programs: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Program',
        },
      ],
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPublished: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      refPath: 'publishedByModel',
    },
    publishedByModel: {
      type: String,
      enum: ['Admin', 'Staff', 'Instructor'],
      default: 'Staff',
    },
    unpublishedAt: {
      type: Date,
    },
    unpublishedBy: {
      type: Schema.Types.ObjectId,
      refPath: 'unpublishedByModel',
    },
    unpublishedByModel: {
      type: String,
      enum: ['Admin', 'Staff', 'Instructor'],
      default: 'Staff',
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },

    // Tracking Settings
    trackingOptions: {
      trackTime: {
        type: Boolean,
        default: true,
      },
      trackScore: {
        type: Boolean,
        default: true,
      },
      trackCompletion: {
        type: Boolean,
        default: true,
      },
      trackInteractions: {
        type: Boolean,
        default: true,
      },
      allowMultipleAttempts: {
        type: Boolean,
        default: true,
      },
      maxAttempts: {
        type: Number,
        min: 1,
      },
      timeLimit: {
        type: Number,
        min: 1,
      },
    },

    // Statistics
    stats: {
      totalAttempts: {
        type: Number,
        default: 0,
      },
      completedAttempts: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        min: 0,
        max: 100,
      },
      averageTimeSpent: {
        type: Number,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
scormPackageSchema.index({ 'assignedTo.learners': 1 });
scormPackageSchema.index({ 'assignedTo.classes': 1 });
scormPackageSchema.index({ 'assignedTo.programs': 1 });
scormPackageSchema.index({ course: 1, program: 1 });
scormPackageSchema.index({ status: 1, isActive: 1 });
scormPackageSchema.index({ isPublished: 1, status: 1 });

// Virtual for completion rate
scormPackageSchema.virtual('completionRate').get(function (this: IScormPackage) {
  if (this.stats.totalAttempts === 0) {
    return 0;
  }
  return (this.stats.completedAttempts / this.stats.totalAttempts) * 100;
});

// Static method to find packages assigned to a learner
scormPackageSchema.statics.findAssignedToLearner = async function (
  learnerId: mongoose.Types.ObjectId
) {
  const orConditions: any[] = [{ 'assignedTo.learners': learnerId }];

  const ProgramEnrollment = mongoose.model('ProgramEnrollment');
  const ClassEnrollment = mongoose.model('ClassEnrollment');

  const programEnrollments = await ProgramEnrollment.find({ learner: learnerId }).select(
    'program'
  );
  const programIds = programEnrollments.map((enrollment: any) => enrollment.program);
  if (programIds.length > 0) {
    orConditions.push({ 'assignedTo.programs': { $in: programIds } });
  }

  const classEnrollments = await ClassEnrollment.find({ learner: learnerId }).select('class');
  const classIds = classEnrollments.map((enrollment: any) => enrollment.class).filter(Boolean);
  if (classIds.length > 0) {
    orConditions.push({ 'assignedTo.classes': { $in: classIds } });
  }

  return this.find({
    $or: orConditions,
    status: 'published',
    isActive: true,
  });
};

// Static method to update statistics
scormPackageSchema.statics.updateStats = async function (
  packageId: string,
  packageObjectId: mongoose.Types.ObjectId
) {
  const ScormAttempt = mongoose.model('ScormAttempt');

  const attempts = await ScormAttempt.find({ package: packageObjectId });

  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter(
    (a: any) => a.status === 'completed' || a.status === 'passed'
  ).length;

  const scores = attempts
    .filter((a: any) => a.scorePercentage !== undefined && a.scorePercentage !== null)
    .map((a: any) => a.scorePercentage);

  const averageScore =
    scores.length > 0
      ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
      : undefined;

  const times = attempts
    .filter((a: any) => a.timeSpentSeconds > 0)
    .map((a: any) => a.timeSpentSeconds);

  const averageTimeSpent =
    times.length > 0
      ? times.reduce((sum: number, time: number) => sum + time, 0) / times.length
      : undefined;

  await this.updateOne(
    { packageId },
    {
      $set: {
        'stats.totalAttempts': totalAttempts,
        'stats.completedAttempts': completedAttempts,
        'stats.averageScore': averageScore,
        'stats.averageTimeSpent': averageTimeSpent,
      },
    }
  );
};

// Model type with statics
interface IScormPackageModel extends Model<IScormPackage> {
  findAssignedToLearner(learnerId: mongoose.Types.ObjectId): Promise<IScormPackage[]>;
  updateStats(packageId: string, packageObjectId: mongoose.Types.ObjectId): Promise<void>;
}

// Create compound indexes for common queries
scormPackageSchema.index({ status: 1, createdAt: -1 }); // List packages by status and date
scormPackageSchema.index({ 'assignedTo.learners': 1, status: 1 }); // Find packages for learner
scormPackageSchema.index({ subject: 1, status: 1 }); // Filter by subject
scormPackageSchema.index({ createdBy: 1, status: 1 }); // Staff packages

const ScormPackage = mongoose.model<IScormPackage, IScormPackageModel>(
  'ScormPackage',
  scormPackageSchema
);

export default ScormPackage;
