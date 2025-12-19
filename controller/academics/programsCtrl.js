const AsyncHandler = require("express-async-handler");
const Admin        = require("../../model/Staff/Admin");
// const ClassLevel = require("../../model/Academic/ClassLevel");
const Program = require("../../model/Academic/Program");

/**
 * @description Create Program
 * @route POST /api/admins/programs
 * @access Private
 */
exports.createProgram = AsyncHandler(async (req, res) => {
    const { name, description } = req.body;
    // cehck if the program exists
    const programFound = await Program.findOne({name}).lean();
    if(programFound){
        throw new Error("Program  already exists");;
    }
    // create
    const programCreated = await Program.create({
        name,
        description,
        createdBy: req.userAuth._id
    });

    const admin = await Admin.findById(req.userAuth._id);
    // push program object into logged in Admin
    admin.programs.push(programCreated._id); // push the created program ID to the admin instance upon creation.
    await admin.save();

    res.status(201).json({
        status: "success",
        message: "Program Created Successfully",
        data: programCreated,
    });
});

/**
 * @description Get All Programs
 * @route GET /api/admins/programs
 * @access Private
 */
exports.getPrograms = AsyncHandler(async (req, res) => {
    
    res.status(200).json(res.results);

});

/**
 * @description Get Single Program
 * @route GET /api/admins/programs/:id
 * @access Private
 */
exports.getSingleProgram = AsyncHandler(async (req, res) => { 
    const singleProgram = await Program.findById(req.params.id);

    res.status(201).json({
        status: "success",
        message: "Single Program fetched successfully",
        data: singleProgram
    });
});

/**
 * @description Update Program
 * @route PUT /api/admins/programs/:id
 * @access Private
 */
exports.updateProgram = AsyncHandler(async (req, res) => {
    const { name, description }   = req.body;
    const programFound = await Program.findOne({name});

    if(programFound){
        throw new Error("Academic term already exists");
    }
    const updatedProgram = await Program.findByIdAndUpdate(
        req.params.id,
        {
            name,
            description,
            createdBy: req.userAuth._id,
        }, {
            new: true, // return updated user instead of original one
        }
    );

    res.status(201).json({
        status: "success",
        message: "Class Level updated successfully",
        data: updatedProgram,
    });
});

/**
 * @description Delete Program
 * @route DELETE /api/admins/programs/:id
 * @access Private
 */
exports.deleteProgram = AsyncHandler(async (req, res) => {
    await Program.findByIdAndDelete(req.params.id);

    res.status(201).json({
        status: "success",
        message: "Program Deleted Successfully",
    });
});