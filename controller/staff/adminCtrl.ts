import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Admin from '../../model/Staff/Admin';
import generateToken from '../../utils/generateToken';
import { hashPassword, isPassMatched } from '../../utils/helpers';
import mongoose from 'mongoose';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';
import Teacher from '../../model/Staff/Teacher';
import logAudit from '../../utils/auditLogger';

// Request body interfaces
interface RegisterAdminBody {
  name: string;
  email: string;
  password: string;
}

interface LoginAdminBody {
  email: string;
  password: string;
}

interface UpdateAdminBody {
  email?: string;
  name?: string;
  password?: string;
  department?: string;
}

/**
 * @description Register admins
 * @route       POST /api/v1/admins/register
 * @access      Private
 */
export const registerAdminCtrl = expressAsyncHandler(
  async (req: Request<{}, {}, RegisterAdminBody>, res: Response): Promise<void> => {
    const { name, email, password } = req.body;

    // Check if admin already exists in the database
    const adminFound = await Admin.findOne({ email });

    if (adminFound) {
      res.status(401).json({ msg: 'Email is already registered' });
      return;
    }

    // register user
    const user = await Admin.create({
      name,
      email,
      password: await hashPassword(password),
    });

    const sanitizedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    res.status(201).json({
      status: 'success',
      data: sanitizedUser,
      message: 'Admin registered successfully. Glad you are here.',
    });
  }
);

/**
 * @description login admins
 * @route       POST /api/v1/admins/login
 * @access      Public
 */
export const loginAdminCtrl = expressAsyncHandler(
  async (req: Request<{}, {}, LoginAdminBody>, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const user = await Admin.findOne({ email });

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid login credentials. Please try again.',
      });
      return;
    }

    // verify password
    const isMatched = await isPassMatched(password, user.password);

    if (!isMatched) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid login credentials. Please try again.',
      });
    } else {
      const role = user.role || 'admin';
      const accessToken = generateToken(user._id.toString(), role);

      res.status(200).json({
        status: 'success',
        data: {
          token: accessToken,
          accessToken,
          role,
        },
        message: 'Admin logged in successfully. Welcome back!',
      });
    }
  }
);

/**
 * @description Get all admins
 * @route       GET /api/v1/admins
 * @access      Private
 */
export const getAdminsCtrl = expressAsyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(res.results);
  }
);

/**
 * @description Get Admin Profile
 * @route       GET /api/v1/admins/profile
 * @access      Private
 */
export const getAdminProfileCtrl = expressAsyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const adminId = req.userAuth?._id;
    const admin = adminId
      ? await Admin.findById(adminId).select('-password -createdAt -updatedAt').lean()
      : null;

    const profile = admin || req.userAuth;

    if (!profile) {
      res.status(404).json({
        status: 'error',
        message: 'Admin not found',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: profile,
      message: 'Admin Profile fetched successfully',
    });
  }
);

/**
 * @description Update Admin
 * @route       UPDATE /api/v1/admins/:id
 * @access      Private
 */
export const updateAdminCtrl = expressAsyncHandler(
  async (req: Request<{}, {}, UpdateAdminBody>, res: Response): Promise<void> => {
    const { email, name, password, department } = req.body;

    // if email is taken
    if (email) {
      const emailExists = await Admin.findOne({ email });
      if (emailExists) {
        throw new Error('This email already exists');
      }
    }

    // department scope validation
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
      const admin = await Admin.findByIdAndUpdate(
        req.userAuth?._id,
        {
          email,
          password: await hashPassword(password),
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
        data: admin,
        message: 'Admin profile updated successfully',
      });
    } else {
      // update user email and name
      const admin = await Admin.findByIdAndUpdate(
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
        data: admin,
        message: 'Admin profile updated successfully',
      });
    }
  }
);

/**
 * @description Admin suspends a teacher
 * @route       PUT /api/v1/admins/suspend/teacher/:id
 * @access      Private
 */
export const adminSuspendTeacherCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const teacherId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(teacherId)) {
      throw new ValidationError('Invalid teacher id');
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const teacherDept = (teacher as any).department?.toString();
    if (scope && scope !== 'all' && teacherDept && !scope.includes(teacherDept)) {
      throw new AuthorizationError('Access denied for this teacher');
    }

    const before = { isSuspended: teacher.isSuspended, isWithdrawn: teacher.isWithdrawn };
    teacher.isSuspended = true;
    await teacher.save();

    await logAudit({
      req,
      action: 'teacher.suspend',
      entityType: 'Teacher',
      entityId: teacher._id,
      reason,
      before,
      after: { isSuspended: true, isWithdrawn: teacher.isWithdrawn },
    });

    res.status(200).json({
      status: 'success',
      data: teacher,
      message: 'Teacher suspended successfully',
    });
  }
);

/**
 * @description Admin unsuspends a teacher
 * @route       PUT /api/v1/admins/unsuspend/teacher/:id
 * @access      Private
 */
export const adminUnsuspendteacherCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const teacherId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(teacherId)) {
      throw new ValidationError('Invalid teacher id');
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const teacherDept = (teacher as any).department?.toString();
    if (scope && scope !== 'all' && teacherDept && !scope.includes(teacherDept)) {
      throw new AuthorizationError('Access denied for this teacher');
    }

    const before = { isSuspended: teacher.isSuspended, isWithdrawn: teacher.isWithdrawn };
    teacher.isSuspended = false;
    await teacher.save();

    await logAudit({
      req,
      action: 'teacher.unsuspend',
      entityType: 'Teacher',
      entityId: teacher._id,
      reason,
      before,
      after: { isSuspended: false, isWithdrawn: teacher.isWithdrawn },
    });

    res.status(200).json({
      status: 'success',
      data: teacher,
      message: 'Teacher unsuspended successfully',
    });
  }
);

/**
 * @description Admin withdrawl a teacher
 * @route       PUT /api/v1/admins/withdraw/teacher/:id
 * @access      Private
 */
export const adminWithdrawTeacherCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const teacherId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(teacherId)) {
      throw new ValidationError('Invalid teacher id');
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const teacherDept = (teacher as any).department?.toString();
    if (scope && scope !== 'all' && teacherDept && !scope.includes(teacherDept)) {
      throw new AuthorizationError('Access denied for this teacher');
    }

    const before = { isSuspended: teacher.isSuspended, isWithdrawn: teacher.isWithdrawn };
    teacher.isWithdrawn = true;
    await teacher.save();

    await logAudit({
      req,
      action: 'teacher.withdraw',
      entityType: 'Teacher',
      entityId: teacher._id,
      reason,
      before,
      after: { isSuspended: teacher.isSuspended, isWithdrawn: true },
    });

    res.status(200).json({
      status: 'success',
      data: teacher,
      message: 'Teacher withdrawn successfully',
    });
  }
);

/**
 * @description Admin Unwithdrawl a teacher
 * @route       PUT /api/v1/admins/unwithdraw/teacher/:id
 * @access      Private
 */
export const adminUnwithdrawTeacherCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const teacherId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(teacherId)) {
      throw new ValidationError('Invalid teacher id');
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new NotFoundError('Teacher not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const teacherDept = (teacher as any).department?.toString();
    if (scope && scope !== 'all' && teacherDept && !scope.includes(teacherDept)) {
      throw new AuthorizationError('Access denied for this teacher');
    }

    const before = { isSuspended: teacher.isSuspended, isWithdrawn: teacher.isWithdrawn };
    teacher.isWithdrawn = false;
    await teacher.save();

    await logAudit({
      req,
      action: 'teacher.unwithdraw',
      entityType: 'Teacher',
      entityId: teacher._id,
      reason,
      before,
      after: { isSuspended: teacher.isSuspended, isWithdrawn: false },
    });

    res.status(200).json({
      status: 'success',
      data: teacher,
      message: 'Teacher unwithdrawn successfully',
    });
  }
);

/**
 * @description Admin Publish Exam Results
 * @route       PUT /api/v1/admins/publish/exam/:id
 * @access      Private
 */
export const adminPublishResultsCtrl = (_req: Request, res: Response): void => {
  try {
    res.status(201).json({
      status: 'success',
      data: 'Admin has published exam result(s) successfully',
    });
  } catch (error) {
    res.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @description Admin Unpublish Exam Results
 * @route       PUT /api/v1/admins/unpublish/exam/:id
 * @access      Private
 */
export const adminUnpublishResultsCtrl = (_req: Request, res: Response): void => {
  try {
    res.status(201).json({
      status: 'success',
      data: 'Admin has Unpublished exam result(s) successfully',
    });
  } catch (error) {
    res.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
