const mongoose = require("mongoose");

const academicYearSchema = new mongoose.Schema(
    {
        name: {
            type:  String,
            required: true,
        },
        fromYear: {
            type: Date,
            required: true,
        },
        toYear: {
            type: Date,
            required: true,
        },
        isCurrent: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
        students: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Student",
            },
        ],
        teachers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Teacher"
            },
        ],
        // Finance
        // Librarian
        // .....
    },
    {
        timestamps: true,
    }
);

// Indexes for query performance
academicYearSchema.index({ name: 1 }, { unique: true });
academicYearSchema.index({ isCurrent: 1 });
academicYearSchema.index({ fromYear: 1 });
academicYearSchema.index({ toYear: 1 });
academicYearSchema.index({ createdAt: -1 });
// Compound index for date range queries
academicYearSchema.index({ fromYear: 1, toYear: 1 });

// model
const AcademicYear = mongoose.model("AcademicYear", academicYearSchema);

module.exports = AcademicYear;