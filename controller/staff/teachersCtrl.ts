import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Teacher from '../../model/Staff/Teacher';
import Admin from '../../model/Staff/Admin';
import { hashPassword, isPassMatched } from '../../utils/helpers';
import generateToken from '../../utils/generateToken';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { AuthorizationError, ValidationError } from '../../utils/errors';

// Request body interfaces
interface RegisterTeacherBody {
  name: string;
  email: string;
  password: string;
  department?: string;
}

interface LoginTeacherBody {
  email: string;
  password: string;
}

interface UpdateTeacherProfileBody {
  email?: string;
  name?: string;
  password?: string;
  department?: string;
}

interface AdminUpdateTeacherBody {
  program?: Types.ObjectId;
  classLevel?: Types.ObjectId;
  academicYear?: Types.ObjectId;
  subject?: Types.ObjectId;
  department?: string;
}

/**
 * @description Admin Register Teacher
 * @route       POST /api/teachers/admins/register
 * @access      Private
 */
export const adminRegisterTeacher = expressAsyncHandler(
  async (req: Request<{}, {}, RegisterTeacherBody>, res: Response): Promise<void> => {
    const { name, email, password, department } = req.body;

    // find the admin
    const adminFound = await Admin.findById(req.userAuth?._id);
    if (!adminFound) {
      throw new Error('Admin not found');
    }

    // check if the teacher already exists
    const teacher = await Teacher.findOne({ email: email }).lean();
    if (teacher) {
      throw new Error('Teacher already employed');
    }

    // hash password
    const hashedPassword = await hashPassword(password);

    // determine department
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const chosenDept = department || (req.userAuth as any)?.department?.toString();
    if (department) {
      if (!mongoose.isValidObjectId(department)) {
        throw new ValidationError('Invalid department id');
      }
      if (scope && scope !== 'all' && !scope.includes(department)) {
        throw new AuthorizationError('Access denied for this department');
      }
    }

    // teacher created
    const teacherCreated = await Teacher.create({
      name,
      email,
      password: hashedPassword,
      department: chosenDept ? new mongoose.Types.ObjectId(chosenDept) : undefined,
    });

    // push teacher into admin
    adminFound.teachers?.push(teacherCreated._id);
    await adminFound.save();

    // send response
    res.status(201).json({
      status: 'success',
      message: 'Teacher registered Successfuly',
      data: teacherCreated,
    });
  }
);

/**
 * @description Login a Teacher
 * @route       POST /api/teachers/login
 * @access      Public
 */
export const loginTeacher = expressAsyncHandler(
  async (req: Request<{}, {}, LoginTeacherBody>, res: Response): Promise<void> => {
    const { email, password } = req.body;

    // find the teacher user obj
    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      res.json({ message: 'Invalid login credentials' });
      return;
    }

    // verify the password
    const isMatched = await isPassMatched(password, teacher.password);
    if (!isMatched) {
      res.json({ message: 'Invalid login credentials' });
    } else {
      const role = teacher.role || 'teacher';
      const accessToken = generateToken(teacher._id.toString(), role);

      res.status(200).json({
        status: 'success',
        message: 'Teacher logged in successfully',
        data: {
          accessToken,
          role,
        },
      });
    }
  }
);

/**
 * @description Get All Teachers
 * @route       GET /api/v1/admin/teachers
 * @access      Private admin only
 */
export const getAllTeachersAdmin = expressAsyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(res.results);
  }
);

/**
 * @description Get Single a Teacher
 * @route       GET /api/teachers/:teacherID/admin
 * @access      Private admin only
 */
export const getTeacherByAdmin = expressAsyncHandler(
  async (req: Request<{ teacherID: string }>, res: Response): Promise<void> => {
    const teacherID = req.params.teacherID;

    try {
      // Try to find the teacher by ID
      const teacher = await Teacher.findById(teacherID);

      // Check if the teacher was found
      if (!teacher) {
        res.status(404).json({
          status: 'error',
          message: 'Teacher not found',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Teacher fetched successfully',
        data: teacher,
      });
    } catch (error) {
      // If an error occurs (e.g., CastError for invalid ObjectId)
      res.status(400).json({
        status: 'error',
        message: 'Invalid teacher ID format',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @description Teacher Profile
 * @route       GET /api/teachers/profile
 * @access      Private Teacher only
 */
export const getTeacherProfile = expressAsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const teacher = await Teacher.findById(req.userAuth?._id).select(
      '-password -createdAt -updatedAt'
    );

    if (!teacher) {
      throw new Error('Teacher not found');
    }

    res.status(200).json({
      status: 'success',
      data: teacher,
      message: 'Teacher profile fetched successfully',
    });
  }
);

/**
 * @description Teacher updating profile
 * @route       UPDATE /api/v1/teachers/:teacherID/update
 * @access      Private Teacher Only
 */
export const teacherUpdateProfile = expressAsyncHandler(
  async (req: Request<{}, {}, UpdateTeacherProfileBody>, res: Response): Promise<void> => {
    const { email, name, password, department } = req.body;

    // if email is taken
    if (email) {
      const emailExists = await Teacher.findOne({ email });
      if (emailExists) {
        throw new Error('This email already exists');
      }
    }

    // department change (self) — only allow within own department scope
    if (department) {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      if (!mongoose.isValidObjectId(department)) {
        throw new ValidationError('Invalid department id');
      }
      if (scope && scope !== 'all' && !scope.includes(department)) {
        throw new AuthorizationError('Access denied for this department');
      }
    }

    // check if user is updating password
    if (password) {
      // update user
      const teacher = await Teacher.findByIdAndUpdate(
        req.userAuth?._id,
        {
          email,
          password: await hashPassword(password),
          name,
        },
        {
          new: true,
          runValidators: true,
        }
      );
      res.status(200).json({
        success: 'success',
        data: teacher,
        message: 'Teacher profile updated successfully',
      });
    } else {
      // update user email and name
      const teacher = await Teacher.findByIdAndUpdate(
        req.userAuth?._id,
        {
          email,
          name,
          department: department ? new mongoose.Types.ObjectId(department) : undefined,
          department: department ? new mongoose.Types.ObjectId(department) : undefined,
        },
        {
          new: true,
          runValidators: true,
        }
      );
      res.status(200).json({
        success: 'success',
        data: teacher,
        message: 'Teacher profile updated successfully',
      });
    }
  }
);

/**
 * @description Admin updating Teacher Profile
 * @route       UPDATE /api/v1/teachers/:teacherID/update/admin
 * @access      Private Admin Only
 */
export const adminUpdateTeacher = expressAsyncHandler(
  async (
    req: Request<{ teacherID: string }, {}, AdminUpdateTeacherBody>,
    res: Response
  ): Promise<void> => {
    const { program, classLevel, academicYear, subject, department } = req.body;

    // find teacher
    const teacherFound = await Teacher.findById(req.params.teacherID);
    if (!teacherFound) {
      throw new Error('Teacher Not found');
    }

    // check if teacher is withdrawn
    if (teacherFound.isWithdrawn) {
      throw new Error('Action denied, teacher is withdrawn');
    }

    // department reassignment with scope checks
    if (department) {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      if (!mongoose.isValidObjectId(department)) {
        throw new ValidationError('Invalid department id');
      }
      if (scope && scope !== 'all' && !scope.includes(department)) {
        throw new AuthorizationError('Access denied for this department');
      }
      teacherFound.department = new mongoose.Types.ObjectId(department);
      await teacherFound.save();
    }

    // assign a program
    if (program) {
      teacherFound.program = program;
      await teacherFound.save();

      res.status(200).json({
        success: 'success',
        data: teacherFound,
        message: 'Teacher profile updated successfully',
      });
      return;
    }

    // assign class level
    if (classLevel) {
      teacherFound.classLevel = classLevel;
      await teacherFound.save();

      res.status(200).json({
        success: 'success',
        data: teacherFound,
        message: 'Teacher profile updated successfully',
      });
      return;
    }

    // assign academic year
    if (academicYear) {
      teacherFound.academicYear = academicYear;
      await teacherFound.save();

      res.status(200).json({
        success: 'success',
        data: teacherFound,
        message: 'Teacher profile updated successfully',
      });
      return;
    }

    // assign subject
    if (subject) {
      teacherFound.subject = subject;
      await teacherFound.save();

      res.status(200).json({
        success: 'success',
        data: teacherFound,
        message: 'Teacher subject updated successfully',
      });
      return;
    }

    // default response when department only update
    res.status(200).json({
      success: 'success',
      data: teacherFound,
      message: 'Teacher profile updated successfully',
    });
  }
);
