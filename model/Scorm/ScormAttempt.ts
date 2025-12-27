import mongoose, { Schema, Model } from 'mongoose';
import { IScormAttempt } from '../../types/scorm';

/**
 * SCORM Attempt Schema
 * Tracks individual student attempts at SCORM content
 */
const scormAttemptSchema = new Schema<IScormAttempt>(
  {
    // Identification
    attemptId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Relationships
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    package: {
      type: Schema.Types.ObjectId,
      ref: 'ScormPackage',
      required: true,
      index: true,
    },

    // Attempt Information
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastAccessedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: ['not_started', 'incomplete', 'completed', 'passed', 'failed', 'suspended'],
      default: 'not_started',
      index: true,
    },

    // CMI Data Model
    cmi: {
      // SCORM 1.2 Core Data
      student_id: String,
      student_name: String,
      lesson_location: String,
      lesson_status: {
        type: String,
        enum: ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted'],
      },
      entry: {
        type: String,
        enum: ['ab-initio', 'resume', ''],
      },
      exit: {
        type: String,
        enum: ['timeout', 'suspend', 'logout', ''],
      },
      credit: {
        type: String,
        enum: ['credit', 'no-credit'],
      },
      mode: {
        type: String,
        enum: ['browse', 'normal', 'review'],
      },

      // SCORM 2004 Core Data
      completion_status: {
        type: String,
        enum: ['completed', 'incomplete', 'not attempted', 'unknown'],
      },
      success_status: {
        type: String,
        enum: ['passed', 'failed', 'unknown'],
      },
      location: String,

      // Score (both versions)
      score: {
        raw: Number,
        min: Number,
        max: Number,
        scaled: Number, // SCORM 2004 only (-1 to 1)
      },

      // Time Tracking
      session_time: {
        type: String,
        default: 'PT0H0M0S',
      },
      total_time: {
        type: String,
        default: 'PT0H0M0S',
      },

      // Suspend Data
      suspend_data: String,

      // Learner Preference
      learner_preference: {
        audio_level: Number,
        language: String,
        delivery_speed: Number,
        audio_captioning: Number,
      },

      // Objectives (SCORM 2004)
      objectives: [
        {
          id: String,
          score: {
            raw: Number,
            min: Number,
            max: Number,
            scaled: Number,
          },
          success_status: {
            type: String,
            enum: ['passed', 'failed', 'unknown'],
          },
          completion_status: {
            type: String,
            enum: ['completed', 'incomplete', 'not attempted', 'unknown'],
          },
          description: String,
          progress_measure: Number,
        },
      ],

      // Interactions
      interactions: [
        {
          id: String,
          type: {
            type: String,
            enum: [
              'true-false',
              'choice',
              'fill-in',
              'long-fill-in',
              'matching',
              'performance',
              'sequencing',
              'likert',
              'numeric',
              'other',
            ],
          },
          timestamp: Date,
          correct_responses: [
            {
              pattern: String,
            },
          ],
          weighting: Number,
          learner_response: String,
          result: {
            type: String,
            enum: ['correct', 'incorrect', 'unanticipated', 'neutral'],
          },
          latency: String,
          description: String,
        },
      ],

      // Comments
      comments_from_learner: [
        {
          comment: String,
          location: String,
          timestamp: Date,
        },
      ],
      comments_from_lms: [
        {
          comment: String,
          location: String,
          timestamp: Date,
        },
      ],

      // Progress (SCORM 2004)
      progress_measure: Number,
      completion_threshold: Number,
      scaled_passing_score: Number,
    },

    // Raw CMI Data (for full spec compliance)
    rawCmiData: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Session Logs
    interactionLog: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        action: {
          type: String,
          enum: ['Initialize', 'GetValue', 'SetValue', 'Commit', 'Terminate'],
          required: true,
        },
        element: String,
        value: Schema.Types.Mixed,
        errorCode: String,
      },
    ],

    // Computed Fields
    timeSpentSeconds: {
      type: Number,
      default: 0,
    },
    scorePercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Instance method to set CMI value
scormAttemptSchema.methods.setCMIValue = function (element: string, value: any) {
  // Update raw CMI data using plain object to permit dotted keys
  this.rawCmiData = this.rawCmiData || {};
  this.rawCmiData[element] = value;

  // Handle common CMI elements
  if (element.startsWith('cmi.core.score')) {
    if (element === 'cmi.core.score.raw') {
      this.cmi.score.raw = parseFloat(value);
    } else if (element === 'cmi.core.score.min') {
      this.cmi.score.min = parseFloat(value);
    } else if (element === 'cmi.core.score.max') {
      this.cmi.score.max = parseFloat(value);
    }
  } else if (element.startsWith('cmi.score')) {
    if (element === 'cmi.score.raw') {
      this.cmi.score.raw = parseFloat(value);
    } else if (element === 'cmi.score.min') {
      this.cmi.score.min = parseFloat(value);
    } else if (element === 'cmi.score.max') {
      this.cmi.score.max = parseFloat(value);
    } else if (element === 'cmi.score.scaled') {
      this.cmi.score.scaled = parseFloat(value);
    }
  } else if (element === 'cmi.core.lesson_status') {
    this.cmi.lesson_status = value;
  } else if (element === 'cmi.completion_status') {
    this.cmi.completion_status = value;
  } else if (element === 'cmi.success_status') {
    this.cmi.success_status = value;
  } else if (element === 'cmi.core.lesson_location' || element === 'cmi.location') {
    this.cmi.lesson_location = value;
    this.cmi.location = value;
  } else if (element === 'cmi.suspend_data') {
    this.cmi.suspend_data = value;
  } else if (element === 'cmi.core.session_time' || element === 'cmi.session_time') {
    this.cmi.session_time = value;
  }

  this.markModified('cmi');
  this.markModified('rawCmiData');
};

// Instance method to get CMI value
scormAttemptSchema.methods.getCMIValue = function (element: string): any {
  // Try to get from raw CMI data first
  if (this.rawCmiData && Object.prototype.hasOwnProperty.call(this.rawCmiData, element)) {
    return this.rawCmiData[element];
  }

  // Fall back to structured data
  if (element === 'cmi.core.score.raw' || element === 'cmi.score.raw') {
    return this.cmi.score.raw || '';
  } else if (element === 'cmi.core.lesson_status') {
    return this.cmi.lesson_status || 'not attempted';
  } else if (element === 'cmi.completion_status') {
    return this.cmi.completion_status || 'not attempted';
  } else if (element === 'cmi.success_status') {
    return this.cmi.success_status || 'unknown';
  }

  return '';
};

// Instance method to calculate completion
scormAttemptSchema.methods.calculateCompletion = function () {
  // Determine status based on CMI data
  const lessonStatus = this.cmi.lesson_status;
  const completionStatus = this.cmi.completion_status;
  const successStatus = this.cmi.success_status;

  if (lessonStatus === 'passed' || successStatus === 'passed') {
    this.status = 'passed';
  } else if (lessonStatus === 'failed' || successStatus === 'failed') {
    this.status = 'failed';
  } else if (lessonStatus === 'completed' || completionStatus === 'completed') {
    this.status = 'completed';
  } else if (lessonStatus === 'incomplete' || completionStatus === 'incomplete') {
    this.status = 'incomplete';
  }

  // Calculate score percentage
  if (this.cmi.score.raw !== undefined && this.cmi.score.raw !== null) {
    if (this.cmi.score.max && this.cmi.score.max > 0) {
      this.scorePercentage = (this.cmi.score.raw / this.cmi.score.max) * 100;
    } else if (this.cmi.score.scaled !== undefined) {
      // SCORM 2004 scaled score is -1 to 1, convert to percentage
      this.scorePercentage = (this.cmi.score.scaled + 1) * 50;
    } else {
      this.scorePercentage = this.cmi.score.raw;
    }
  }
};

// Static method to get or create attempt
scormAttemptSchema.statics.getOrCreateAttempt = async function (
  studentId: mongoose.Types.ObjectId,
  packageId: mongoose.Types.ObjectId,
  attemptNumber?: number
) {
  if (attemptNumber) {
    // Resume existing attempt
    return await this.findOne({
      student: studentId,
      package: packageId,
      attemptNumber,
    });
  }

  // Find last attempt number
  const lastAttempt = await this.findOne({
    student: studentId,
    package: packageId,
  }).sort({ attemptNumber: -1 });

  const newAttemptNumber = lastAttempt ? lastAttempt.attemptNumber + 1 : 1;

  // Create new attempt
  const attemptId = `${packageId}-${studentId}-${newAttemptNumber}-${Date.now()}`;

  return await this.create({
    attemptId,
    student: studentId,
    package: packageId,
    attemptNumber: newAttemptNumber,
    status: 'not_started',
    cmi: {
      score: {},
      session_time: 'PT0H0M0S',
      total_time: 'PT0H0M0S',
    },
  });
};

// Model type with statics
interface IScormAttemptModel extends Model<IScormAttempt> {
  getOrCreateAttempt(
    studentId: mongoose.Types.ObjectId,
    packageId: mongoose.Types.ObjectId,
    attemptNumber?: number
  ): Promise<IScormAttempt>;
}

// Create compound indexes for common queries (avoid duplicate coverage of student/package)
scormAttemptSchema.index({ package: 1, status: 1 }); // Find all attempts by status for analytics
scormAttemptSchema.index({ student: 1, startedAt: -1 }); // Student's recent attempts
scormAttemptSchema.index({ 'cmi.completion_status': 1, package: 1 }); // Completion tracking
scormAttemptSchema.index({ student: 1, package: 1, attemptNumber: 1 }, { unique: true }); // Prevent duplicate attempts

const ScormAttempt = mongoose.model<IScormAttempt, IScormAttemptModel>(
  'ScormAttempt',
  scormAttemptSchema
);

export default ScormAttempt;
