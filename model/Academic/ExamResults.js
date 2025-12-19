const mongoose = require("mongoose");

const { Schema } = mongoose;

// Exam result Schema
const  examResultSchema = new Schema(
  {
    studentID: {
        type: String,
        required: true,
    },
    exam: {
        type: Schema.Types.ObjectId,
        ref: "Exam",
        required: true,
    },
    grade: {
        type: Number,
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    passMark: {
        type: Number,
        required: true,
        default: 30,
    },
    answeredQuestions : [
        {
            type: Object,
        }
    ],
    // failed/passed
    status: {
        type: String,
        required: true,
        enum: ["Fail", "Pass"],
        default: "Fail",
    },
    // Excellent/Good/Poor
    remarks: {
        type: String,
        required: true,
        enum: ["Excellent!", "Very Good", "Good", "Fair", "Needs Improvement"],
        default: "Poor",
    },
    classLevel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClassLevel",
    },
    academicTerm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicTerm",
        required: true,
    },
    academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AcademicYear",
        required: true,
    },
    isPublished: {
        type: Boolean,
        default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for query performance
examResultSchema.index({ studentID: 1 });
examResultSchema.index({ exam: 1 });
examResultSchema.index({ academicYear: 1 });
examResultSchema.index({ academicTerm: 1 });
examResultSchema.index({ classLevel: 1 });
examResultSchema.index({ status: 1 });
examResultSchema.index({ isPublished: 1 });
examResultSchema.index({ createdAt: -1 });
// Compound indexes for common queries
examResultSchema.index({ studentID: 1, academicYear: 1 });
examResultSchema.index({ studentID: 1, exam: 1 }, { unique: true });
examResultSchema.index({ exam: 1, status: 1 });
examResultSchema.index({ academicYear: 1, academicTerm: 1, classLevel: 1 });
examResultSchema.index({ isPublished: 1, createdAt: -1 });

const ExamResult = mongoose.model("ExamResult", examResultSchema);

module.exports = ExamResult;