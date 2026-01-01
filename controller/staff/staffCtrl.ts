import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Staff from '../../model/Staff/Staff';
import Admin from '../../model/Staff/Admin';
import { hashPassword, isPassMatched } from '../../utils/helpers';
import generateToken from '../../utils/generateToken';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { AuthorizationError, ValidationError } from '../../utils/errors';

// Request body interfaces
interface RegisterStaffBody {
  name: string;
  email: string;
  password: string;
  department?: string;
}

interface LoginStaffBody {
  email: string;
  password: string;
}

interface UpdateStaffProfileBody {
  email?: string;
  name?: string;
  password?: string;
  department?: string;
}

interface AdminUpdateStaffBody {
  program?: Types.ObjectId;
  classLevel?: Types.ObjectId;
  academicYear?: Types.ObjectId;
  subject?: Types.ObjectId;
  department?: string;
}

/**
 * @description Admin Register Staff
 * @route       POST /api/v1/staff/admin/register
 * @access      Private
 */
export const adminRegisterStaff = expressAsyncHandler(
  async (req: Request<{}, {}, RegisterStaffBody>, res: Response): Promise<void> => {
    const { name, email, password, department } = req.body;

    // find the admin
    const adminFound = await Admin.findById(req.userAuth?._id);
    if (!adminFound) {
      throw new Error('Admin not found');
    }

    // check if the staff member already exists
    const existingStaff = await Staff.findOne({ email: email }).lean();
    if (existingStaff) {
      throw new Error('Staff member already employed');
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

    // staff created
    const staffCreated = await Staff.create({
      name,
      email,
      password: hashedPassword,
      department: chosenDept ? new mongoose.Types.ObjectId(chosenDept) : undefined,
    });

    // push staff into admin
    adminFound.instructors?.push(staffCreated._id);
    await adminFound.save();

    // send response
    res.status(201).json({
      status: 'success',
      message: 'Staff registered Successfuly',
      data: staffCreated,
    });
  }
);

/**
 * @description Login a Staff member
 * @route       POST /api/v1/staff/login
 * @access      Public
 */
export const loginStaff = expressAsyncHandler(
  async (req: Request<{}, {}, LoginStaffBody>, res: Response): Promise<void> => {
    const { email, password } = req.body;

    // find the staff user obj
    const staff = await Staff.findOne({ email });
    if (!staff) {
      res.json({ message: 'Invalid login credentials' });
      return;
    }

    // verify the password
    const isMatched = await isPassMatched(password, staff.password);
    if (!isMatched) {
      res.json({ message: 'Invalid login credentials' });
    } else {
      const role = staff.role || 'staff';
      const accessToken = generateToken(staff._id.toString(), role);

      res.status(200).json({
        status: 'success',
        message: 'Staff logged in successfully',
        data: {
          accessToken,
          role,
        },
      });
    }
  }
);

/**
 * @description Get All Staff
 * @route       GET /api/v1/staff/admin
 * @access      Private global-admin only
 */
export const getAllStaffAdmin = expressAsyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(res.results);
  }
);

/**
 * @description Get Single Staff member
 * @route       GET /api/v1/staff/:staffID/admin
 * @access      Private global-admin only
 */
export const getStaffByAdmin = expressAsyncHandler(
  async (req: Request<{ staffID: string }>, res: Response): Promise<void> => {
    const staffID = req.params.staffID;

    try {
      // Try to find the staff member by ID
      const staff = await Staff.findById(staffID);

      // Check if the staff member was found
      if (!staff) {
        res.status(404).json({
          status: 'error',
          message: 'Staff member not found',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        message: 'Staff member fetched successfully',
        data: staff,
      });
    } catch (error) {
      // If an error occurs (e.g., CastError for invalid ObjectId)
      res.status(400).json({
        status: 'error',
        message: 'Invalid staff ID format',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @description Staff Profile
 * @route       GET /api/v1/staff/profile
 * @access      Private staff only
 */
export const getStaffProfile = expressAsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const staff = await Staff.findById(req.userAuth?._id).select(
      '-password -createdAt -updatedAt'
    );

    if (!staff) {
      throw new Error('Staff member not found');
    }

    res.status(200).json({
      status: 'success',
      data: staff,
      message: 'Staff profile fetched successfully',
    });
  }
);

/**
 * @description Staff updating profile
 * @route       UPDATE /api/v1/staff/:staffID/update
 * @access      Private staff only
 */
export const staffUpdateProfile = expressAsyncHandler(
  async (req: Request<{}, {}, UpdateStaffProfileBody>, res: Response): Promise<void> => {
    const { email, name, password, department } = req.body;

    // if email is taken
    if (email) {
      const emailExists = await Staff.findOne({ email });
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
      const staff = await Staff.findByIdAndUpdate(
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
        data: staff,
        message: 'Staff profile updated successfully',
      });
    } else {
      // update user email and name
      const staff = await Staff.findByIdAndUpdate(
        req.userAuth?._id,
        {
          email,
          name,
          department: department ? new mongoose.Types.ObjectId(department) : undefined,
        },
        {
          new: true,
          runValidators: true,
        }
      );
      res.status(200).json({
        success: 'success',
        data: staff,
        message: 'Staff profile updated successfully',
      });
    }
  }
);

/**
 * @description Admin updating Staff Profile
 * @route       UPDATE /api/v1/staff/:staffID/update/admin
 * @access      Private admin only
 */
export const adminUpdateStaff = expressAsyncHandler(
  async (
    req: Request<{ staffID: string }, {}, AdminUpdateStaffBody>,
    res: Response
  ): Promise<void> => {
    const { program, classLevel, academicYear, subject, department } = req.body;

    // find staff
    const staffFound = await Staff.findById(req.params.staffID);
    if (!staffFound) {
      throw new Error('Staff member not found');
    }

    // check if staff member is withdrawn
    if (staffFound.isWithdrawn) {
      throw new Error('Action denied, staff member is withdrawn');
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
      staffFound.department = new mongoose.Types.ObjectId(department);
      await staffFound.save();
    }

    // assign a program
    if (program) {
      staffFound.program = program;
      await staffFound.save();

      res.status(200).json({
        success: 'success',
        data: staffFound,
        message: 'Staff profile updated successfully',
      });
      return;
    }

    // assign class level
    if (classLevel) {
      staffFound.classLevel = classLevel;
      await staffFound.save();

      res.status(200).json({
        success: 'success',
        data: staffFound,
        message: 'Staff profile updated successfully',
      });
      return;
    }

    // assign academic year
    if (academicYear) {
      staffFound.academicYear = academicYear;
      await staffFound.save();

      res.status(200).json({
        success: 'success',
        data: staffFound,
        message: 'Staff profile updated successfully',
      });
      return;
    }

    // assign subject
    if (subject) {
      staffFound.subject = subject;
      await staffFound.save();

      res.status(200).json({
        success: 'success',
        data: staffFound,
        message: 'Staff subject updated successfully',
      });
      return;
    }

    // default response when department only update
    res.status(200).json({
      success: 'success',
      data: staffFound,
      message: 'Staff profile updated successfully',
    });
  }
);
