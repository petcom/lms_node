import mongoose, { Schema, Model } from 'mongoose';
import { IScormPackage } from '../../types/scorm';

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
    subject: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
    },
    program: {
      type: Schema.Types.ObjectId,
      ref: 'Program',
    },
    classLevel: {
      type: Schema.Types.ObjectId,
      ref: 'ClassLevel',
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

    // Access Control
    createdBy: {
      type: Schema.Types.ObjectId,
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
      enum: ['Admin', 'Teacher', 'Student'],
      default: 'Teacher',
    },
    assignedTo: {
      students: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Student',
        },
      ],
      classLevels: [
        {
          type: Schema.Types.ObjectId,
          ref: 'ClassLevel',
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
      enum: ['Admin', 'Teacher'],
      default: 'Teacher',
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
      enum: ['Admin', 'Teacher'],
      default: 'Teacher',
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
scormPackageSchema.index({ 'assignedTo.students': 1 });
scormPackageSchema.index({ 'assignedTo.classLevels': 1 });
scormPackageSchema.index({ 'assignedTo.programs': 1 });
scormPackageSchema.index({ subject: 1, program: 1 });
scormPackageSchema.index({ status: 1, isActive: 1 });
scormPackageSchema.index({ isPublished: 1, status: 1 });

// Virtual for completion rate
scormPackageSchema.virtual('completionRate').get(function (this: IScormPackage) {
  if (this.stats.totalAttempts === 0) {
    return 0;
  }
  return (this.stats.completedAttempts / this.stats.totalAttempts) * 100;
});

// Static method to find packages assigned to a student
scormPackageSchema.statics.findAssignedToStudent = async function (
  studentId: mongoose.Types.ObjectId
) {
  const student = await mongoose.model('Student').findById(studentId).lean();

  const orConditions: any[] = [{ 'assignedTo.students': studentId }];

  if (student?.program) {
    orConditions.push({ 'assignedTo.programs': student.program });
  }

  const validClassLevels = Array.isArray(student?.classLevels)
    ? (student!.classLevels as any[]).filter((lvl) => mongoose.Types.ObjectId.isValid(lvl))
    : [];

  if (validClassLevels.length > 0) {
    orConditions.push({ 'assignedTo.classLevels': { $in: validClassLevels } });
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
  
  const averageScore = scores.length > 0
    ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
    : undefined;
  
  const times = attempts
    .filter((a: any) => a.timeSpentSeconds > 0)
    .map((a: any) => a.timeSpentSeconds);
  
  const averageTimeSpent = times.length > 0
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
  findAssignedToStudent(studentId: mongoose.Types.ObjectId): Promise<IScormPackage[]>;
  updateStats(packageId: string, packageObjectId: mongoose.Types.ObjectId): Promise<void>;
}

// Create compound indexes for common queries
scormPackageSchema.index({ status: 1, createdAt: -1 }); // List packages by status and date
scormPackageSchema.index({ 'assignedTo.students': 1, status: 1 }); // Find packages for student
scormPackageSchema.index({ subject: 1, status: 1 }); // Filter by subject
scormPackageSchema.index({ createdBy: 1, status: 1 }); // Teacher's packages

const ScormPackage = mongoose.model<IScormPackage, IScormPackageModel>(
  'ScormPackage',
  scormPackageSchema
);

export default ScormPackage;
