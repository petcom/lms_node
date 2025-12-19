const expressAsyncHandler = require("express-async-handler");
const Teacher = require("../../model/Staff/Teacher");
const { hashPassword, isPassMatched } = require("../../utils/helpers");
const generateToken = require("../../utils/generateToken");
const Admin = require("../../model/Staff/Admin");

/**
 * @description Admin Register Teacher
 * @route       POST /api/teachers/admins/register
 * @access      Private
 */
exports.adminRegisterTeacher = expressAsyncHandler(async (req, res) => {
    const { name, email, password } =req.body;
    // find the admin
    const adminFound = await Admin.findById(req.userAuth._id);
    if (!adminFound) {
        throw new Error("Admin not found");
    }
    // check if the teacher already exists
    const teacher = await Teacher.findOne( {email: email} ).lean();
    if (teacher) {
        throw new Error("Teacher already employed");
    }
    //hash password
    const hashedPassword = await hashPassword(password);;
    // teacher created
    const teacherCreated = await Teacher.create({
        name,
        email,
        password: hashedPassword,
    });
    // push teacher into admin
    adminFound.teachers.push(teacherCreated?._id);
    await adminFound.save();
    // send response
    res.status(201).json({
        status: "success",
        message: "Teacher registered Successfuly",
        data: teacherCreated,
    });
});

/**
 * @description Login a Teacher
 * @route       POST /api/teachers/login
 * @access      Public
 */

exports.loginTeacher = expressAsyncHandler(async  (req, res)=>{
    const { email, password } = req.body;

    //find the teacher user obj
    const teacher = await Teacher.findOne({email});
    if( !teacher ) {
        return res.json({message: "Invalid login credentials"});
    }
    // verify the password
    const isMatched = await isPassMatched(password, teacher?.password);
    if ( !isMatched ) {
        return res.json({message:"Invalid login credentials"});
    } else {
        res.status(200).json({
            status: "success",
            message: "Teacher logged in successfully",
            data: generateToken(teacher?._id),
        });
    }
});

/**
 * @description Get All Teachers
 * @route       GET /api/v1/admin/teachers
 * @access      Private admin only
 */
exports.getAllTeachersAdmin = expressAsyncHandler( async(req, res) => {

    res.status(200).json(res.results);
    
});

/**
 * @description Get Single a Teacher
 * @route       POST /api/teachers/:teacherID/admin
 * @access      Private admin only
 */
exports.getTeacherByAdmin = expressAsyncHandler(async(req, res) => {
    const teacherID = req.params.teacherID;

    try {
        // Try to find the teacher by ID
        const teacher = await Teacher.findById(teacherID);
        
        // Check if the teacher was found
        if (!teacher) {
            return res.status(404).json({
                status: "error",
                message: "Teacher not found"
            });
        }

        res.status(200).json({
            status: "success",
            message: "Teacher fetched successfully",
            data: teacher
        });
    } catch (error) {
        // If an error occurs (e.g., CastError for invalid ObjectId)
        res.status(400).json({
            status: "error",
            message: "Invalid teacher ID format",
            error: error.message // Optional: provide error message for debugging
        });
    }
});

/**
 * @description Teacher Profile
 * @route       Get /api/teachers/profile
 * @access      Private Teacher only
 */
exports.getTeacherProfile = expressAsyncHandler( async(req, res) => {
    const teacher = await Teacher.findById(req.userAuth?._id).select('-password -createdAt -updatedAt');

    if(!teacher) {
        throw new Error("Teacher not found");
    }
    res.status(200).json({
        status: "success",
        data: teacher,
        message: "Teacher profile fetched successfully",
    });
});

/**
 * @description Teacher updating profile admin
 * @route       UPDATE /api/v1/teachers/:teacherID/update
 * @access      Private Teacher Only
 */
exports.teacherUpdateProfile = expressAsyncHandler(async (req, res) => {
    const {email, name, password} = req.body;
    // if email is taken
    const emailExists = await Teacher.findOne({email});
    if(emailExists) {
        throw new Error("This email already exists");
    }

    // check if user is updating password
    if(password){
        // update user
        const teacher = await Teacher.findByIdAndUpdate(req.userAuth._id, {
            email,
            password: await hashPassword(password),
            name,
        }, {
            new: true,
            runValidators: true,
        });
        res.status(200).json({
            success: "success",
            data: teacher,
            message: "Teacher profile updated successfully",
        });
    } else {
        // update user email and name
        const teacher = await Teacher.findByIdAndUpdate(req.userAuth._id, {
            email,
            name,
        }, {
            new: true,
            runValidators: true,
        });
        res.status(200).json({
            success: "success",
            data: teacher,
            message: "Teacher profile updated successfully",
        });
    }
});

/**
 * @description Admin updating Teacher Profile
 * @route       UPDATE /api/v1/teachers/:teacherID/update/admin
 * @access      Private Admin Only
 */
exports.adminUpdateTeacher = expressAsyncHandler(async (req, res) => {
    const {program, classLevel, academicYear, subject, } = req.body;
    // if email is taken
    const teacherFound = await Teacher.findById(req.params.teacherID);
    if(!teacherFound) {
        throw new Error("Teacher Not found");
    }

    // check if teacher is withdrawn
    if (teacherFound.isWithdrawn){
        throw new Error("Action denied, teacher is withdrawn");
    }

    // assign a program
    if(program){
        teacherFound.program = program;
        await teacherFound.save();

        res.status(200).json({
            success: "success",
            data: teacherFound,
            message: "Teacher profile updated successfully",
        });
    }

    // assign class level
    if(classLevel){
        teacherFound.classLevel = classLevel;
        await teacherFound.save();

        res.status(200).json({
            success: "success",
            data: teacherFound,
            message: "Teacher profile updated successfully",
        });
    }

    // assign academic year
    if(academicYear){
        teacherFound.academicYear =  academicYear;
        await teacherFound.save();

        res.status(200).json({
            success: "success",
            data: teacherFound,
            message: "Teacher profile updated successfully",
        });
    }

    // assign subject
    if(subject){
        teacherFound.subject =  subject;
        await teacherFound.save();

        res.status(200).json({
            success: "success",
            data: teacherFound,
            message: "Teacher subject updated successfully",
        });
    }

    
});