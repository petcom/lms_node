const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        studentId: {
            type: String,
            required: true,
            default: function() {
                return (
                    "STU" +
                    Math.floor(100 + Math.random() * 900) +
                    Date.now().toString().slice(2, 4) +
                    this.name
                        .split("  ")
                        .map(function(name) { return name[0]; })
                        .join("")
                        .toUpperCase()
                );
            },
        },
        role: {
            type: String,
            default: "student",
        },
        /**
         * Classes are from level 1 to 6
         * keep track of the class level 
         * the student is in
         */
        classLevels: [
            {
                type: String,
            },
        ],
        currentClassLevel: {
            type: String,
            default: function() {
                return this.classLevels[this.classLevels.length -1];
            },
        },
        academicYear: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AcademicYear",
        },
        dateAdmitted: {
            type: Date,
            default: Date.now(),
        },
        examResults: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ExamResult"
            },
        ],
        program: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Program",
        },
        isPromotedToLevel200: {
            type: Boolean,
            default: false,
        },
        isPromotedToLevel300: {
            type: Boolean,
            default: false,
        },
        isPromotedToLevel400: {
            type: Boolean,
            default: false,
        },
        isGraduated: {
            type: Boolean,
            default: false,
        },
        isWithdrawn: {
            type: Boolean,
            default: false,
        },
        isSuspended: {
            type: Boolean,
            default: false,
        },
        prefectName: {
            type: String,
        },
        // behaviorReport: [
        //     {
        //         type: mongoose.Schema.Types.ObjectId, 
        //         ref: "BehaviorReport",
        //     },
        // ],
        // financialReport: [
        //     {
        //         type: mongoose.Schema.Types.ObjectId,
        //         ref: "FinancialReport",
        //     },
        // ],`
        // year group
        yearGraduated: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for query performance
studentSchema.index({ email: 1 }, { unique: true });
studentSchema.index({ studentId: 1 }, { unique: true });
studentSchema.index({ currentClassLevel: 1 });
studentSchema.index({ academicYear: 1 });
studentSchema.index({ program: 1 });
studentSchema.index({ isGraduated: 1 });
studentSchema.index({ isSuspended: 1 });
studentSchema.index({ createdAt: -1 });
// Compound index for common queries
studentSchema.index({ academicYear: 1, currentClassLevel: 1 });
studentSchema.index({ program: 1, currentClassLevel: 1 });

// Model
const Student = mongoose.model( "Student", studentSchema );

// Defining some constants
Student.STUDENT_PASS = "Pass";
Student.STUDENT_FAIL = "Fail";

module.exports = Student;