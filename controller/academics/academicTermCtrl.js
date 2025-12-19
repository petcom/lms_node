const AsyncHandler = require("express-async-handler");
const Admin        = require("../../model/Staff/Admin");
const AcademicTerm = require("../../model/Academic/AcademicTerm");

/**
 * @description Create Academic Term
 * @route POST /api/admins/academic-terms
 * @access Private
 */
exports.createAcademicTerm = AsyncHandler(async (req, res) => {
    const { name, description, duration } = req.body;
    // cehck if the year exists
    const academicTerm = await AcademicTerm.findOne({name}).lean();
    if(academicTerm){
        throw new Error("Academic term already exists");
    }
    // create
    const academicTermCreated = await AcademicTerm.create({
        name,
        description,
        duration,
        createdBy: req.userAuth._id
    });
    // push academic year into Admin
    const admin = await Admin.findById(req.userAuth._id);

    admin.academicTerms.push(academicTermCreated._id); // push the created term ID to the admin instance upon creation.
    await admin.save();

    res.status(201).json({
        status: 'success',
        message: "Academic term created",
        data: academicTermCreated,
    });

});

/**
 * @description Get All Academic Terms
 * @route GET /api/admins/academic-terms
 * @access Private
 */
exports.getAcademicTerms = AsyncHandler(async (req, res) => {
    
    res.status(200).json(res.results);

});

/**
 * @description Get Single Academic Terms
 * @route GET /api/admins/academic-terms/:id
 * @access Private
 */
exports.getAcademicTerm = AsyncHandler(async (req, res) => {
    const academicTerm = await AcademicTerm.findById(req.params.id);

    res.status(201).json({
        status: "success",
        message: "Academic Term fetched successfully",
        data: academicTerm
    });
});

/**
 * @description Update Academic Term
 * @route PUT /api/admins/academic-terms/:id
 * @access Private
 */
exports.updateAcademicTerms = AsyncHandler(async (req, res) => {
    const { name, description, duration } = req.body;
    const createAcademicTermFound    = await AcademicTerm.findOne({name});

    if(createAcademicTermFound){
        throw new Error("Academic term already exists");
    }
    const academicTerm = await  AcademicTerm.findByIdAndUpdate(
        req.params.id,
        {
            name,
            description,
            duration,
            createdBy: req.userAuth._id,
        }, {
            new: true, // return updated user instead of original one
        }
    );

    res.status(201).json({
        status: "success",
        message: "Academic term updated successfully",
        data: academicTerm,
    });
});

/**
 * @description Delete Academic Term
 * @route DELETE /api/admins/academic-terms/:id
 * @access Private
 */
exports.deleteAcademicTerm = AsyncHandler(async (req, res) => {
    await AcademicTerm.findByIdAndDelete(req.params.id);

    res.status(201).json({
        status: "success",
        message: "Academic term deleted successfully",
    });
});