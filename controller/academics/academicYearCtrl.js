const AsyncHandler = require("express-async-handler");
const AcademicYear = require("../../model/Academic/AcademicYear");
const Admin        = require("../../model/Staff/Admin");

/**
 * @description Create Academic Year
 * @route POST /api/admins/academic-years
 * @access Private
 */
exports.createAcademicYear = AsyncHandler(async (req, res) => {
    const { name, fromYear, toYear } = req.body;
    // cehck if the year exists
    const academicYear = await AcademicYear.findOne({name}).lean();
    if(academicYear){
        throw new Error("Academic year already exists");
    }
    // create
    const academicYearCreated = await AcademicYear.create({
        name,
        fromYear,
        toYear,
        createdBy: req.userAuth._id
    });
    // push academic year into Admin
    const admin = await Admin.findById(req.userAuth._id);

    admin.academicYear.push(academicYearCreated._id);
    await admin.save();

    res.status(201).json({
        status: 'success',
        message: "Academic year created",
        data: academicYearCreated,
    });

});

/**
 * @description Get All Academic Years
 * @route GET /api/admins/academic-years
 * @access Private
 */
exports.getAcademicYears = AsyncHandler(async (req, res) => {

    res.status(200).json(res.results);

});

/**
 * @description Get Single Academic Year
 * @route GET /api/admins/academic-years/:id
 * @access Private
 */
exports.getAcademicYear = AsyncHandler(async (req, res) => {
    const academicYear = await AcademicYear.findById(req.params.id).lean();

    res.status(201).json({
        status: "success",
        message: "Academic year fetched successfully",
        data: academicYear
    });
});

/**
 * @description Update Academic Year
 * @route PUT /api/admins/academic-years/:id
 * @access Private
 */
exports.updateAcademicYear = AsyncHandler(async (req, res) => {
    const { name, fromYear, toYear } = req.body;
    const createAcademicYearFound    = await AcademicYear.findOne({name}).lean();

    if(createAcademicYearFound){
        throw new Error("Academic year already exists");
    }
    const academicYear = await  AcademicYear.findByIdAndUpdate(
        req.params.id,
        {
            name,
            fromYear,
            toYear,
            createdBy: req.userAuth._id,
        }, {
            new: true, // return updated user instead of original one
        }
    );

    res.status(201).json({
        status: "success",
        message: "Academic years updated successfully",
        data: academicYear,
    });
});

/**
 * @description Delete Academic Year
 * @route GET /api/admins/academic-years/:id
 * @access Private
 */
exports.deleteAcademicYear = AsyncHandler(async (req, res) => {
    await AcademicYear.findByIdAndDelete(req.params.id);

    res.status(201).json({
        status: "success",
        message: "Academic years deleted successfully",
    });
});