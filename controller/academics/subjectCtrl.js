const AsyncHandler = require("express-async-handler");
const Admin        = require("../../model/Staff/Admin");
const Subject = require("../../model/Academic/Subject");
const Program = require("../../model/Academic/Program");

/**
 * @description Create Subject
 * @route POST /api/admins/subjects/:programID
 * @access Private
 */
exports.createSubject = AsyncHandler(async (req, res) => {
    const { name, description, academicTerm } = req.body;
    // find the program
    const programFound = await Program.findById(req.params.programID);
    if(!programFound){
        throw new Error("Program not found");
    }
    //check if exists
    const subjectFound = await Subject.findOne({name}).lean();
    if(subjectFound){
        throw new Error("Subject already exists");
    }

    // create
    const subjectCreated = await Subject.create({
        name,
        description,
        academicTerm,
        createdBy: req.userAuth._id
    });

    // push the program
    programFound.subjects.push(subjectCreated._id);
    // save
    await programFound.save();

    res.status(201).json({
        status: "success",
        message: "Program Created Successfully",
        data: subjectCreated,
    });
});

/**
 * @description Get All Subjects
 * @route GET /api/admins/subjects
 * @access Private
 */
exports.getSubjects = AsyncHandler(async (req, res) => {
    
    res.status(200).json(res.results);

});

/**
 * @description Get Single Subject
 * @route GET /api/admins/subjects/:id
 * @access Private
 */
exports.getSubject = AsyncHandler(async (req, res) => { 
    const singleSubject = await Subject.findById(req.params.id);

    res.status(201).json({
        status: "success",
        message: "Single Subject fetched successfully",
        data: singleSubject
    });
});

/**
 * @description Update Subject
 * @route PUT /api/admins/subjects/:id
 * @access Private
 */
exports.updateSubject = AsyncHandler(async (req, res) => {
    const { name, description, academicTerm }   = req.body;
    const subjectFound = await Subject.findOne({name});

    if(subjectFound){
        throw new Error("Subject already exists");
    }
    const subject = await Subject.findByIdAndUpdate(
        req.params.id,
        {
            name,
            description,
            academicTerm,
            createdBy: req.userAuth._id,
        }, {
            new: true, // return updated user instead of original one
        }
    );

    res.status(201).json({
        status: "success",
        message: "Subject updated successfully",
        data: subject,
    });
});

/**
 * @description Delete Subject
 * @route DELETE /api/admins/subjects/:id
 * @access Private
 */
exports.deleteSubject = AsyncHandler(async (req, res) => {
    await Subject.findByIdAndDelete(req.params.id);

    res.status(201).json({
        status: "success",
        message: "Subject Deleted Successfully",
    });
});