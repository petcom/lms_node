import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Admin from '../../model/Staff/Admin';
import generateToken from '../../utils/generateToken';
import { hashPassword, isPassMatched } from '../../utils/helpers';
import mongoose from 'mongoose';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';
import Staff from '../../model/Staff/Staff';
import Learner from '../../model/Academic/Learner';
import logAudit from '../../utils/auditLogger';
import { normalizePersonName, PersonNameInput } from '../../utils/person';

// Request body interfaces
interface RegisterAdminBody {
  name: PersonNameInput;
  email: string;
  password: string;
}

interface LoginAdminBody {
  email: string;
  password: string;
}

interface UpdateAdminBody {
  email?: string;
  name?: PersonNameInput;
  password?: string;
  department?: string;
}

/**
 * @description Register admins
 * @route       POST /api/v1/staff/admins/register
 * @access      Private
 */
export const registerAdminCtrl = expressAsyncHandler(
  async (req: Request<{}, {}, RegisterAdminBody>, res: Response): Promise<void> => {
    const { name, email, password } = req.body;
    const normalizedName = normalizePersonName(name);

    // Check if admin already exists in the database
    const adminFound = await Admin.findOne({ email });

    if (adminFound) {
      res.status(401).json({ msg: 'Email is already registered' });
      return;
    }

    // register user
    const user = await Admin.create({
      name: normalizedName ?? name,
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
 * @route       POST /api/v1/staff/admins/login
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
      const role = user.role || 'global-admin';
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
 * @route       GET /api/v1/staff/admins
 * @access      Private
 */
export const getAdminsCtrl = expressAsyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(res.results);
  }
);

/**
 * @description Get Admin Profile
 * @route       GET /api/v1/staff/admins/profile
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
 * @route       UPDATE /api/v1/staff/admins/:id
 * @access      Private
 */
export const updateAdminCtrl = expressAsyncHandler(
  async (req: Request<{}, {}, UpdateAdminBody>, res: Response): Promise<void> => {
    const { email, name, password, department } = req.body;
    const normalizedName = normalizePersonName(name);
    const updateFields: {
      email?: string;
      password?: string;
      name?: PersonNameInput;
      department?: mongoose.Types.ObjectId;
    } = {};

    // if email is taken
    if (email) {
      const emailExists = await Admin.findOne({ email });
      if (emailExists) {
        throw new Error('This email already exists');
      }
      updateFields.email = email;
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
      updateFields.department = new mongoose.Types.ObjectId(department);
    }

    // check if user is updating password
    if (password) {
      updateFields.password = await hashPassword(password);
      if (typeof name !== 'undefined') {
        updateFields.name = normalizedName ?? name;
      }
      // update user
      const admin = await Admin.findByIdAndUpdate(
        req.userAuth?._id,
        updateFields,
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
      if (typeof name !== 'undefined') {
        updateFields.name = normalizedName ?? name;
      }
      // update user email and name
      const admin = await Admin.findByIdAndUpdate(
        req.userAuth?._id,
        updateFields,
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
 * @description Admin suspends a staff member
 * @route       PUT /api/v1/staff/admins/suspend/staff/:id
 * @access      Private
 */
export const adminSuspendInstructorCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const instructorId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(instructorId)) {
      throw new ValidationError('Invalid staff id');
    }

    const instructor = await Staff.findById(instructorId);
    if (!instructor) {
      throw new NotFoundError('Staff member not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const instructorDept = (instructor as any).department?.toString();
    if (scope && scope !== 'all' && instructorDept && !scope.includes(instructorDept)) {
      throw new AuthorizationError('Access denied for this staff member');
    }

    const before = { isSuspended: instructor.isSuspended, isWithdrawn: instructor.isWithdrawn };
    instructor.isSuspended = true;
    await instructor.save();

    await logAudit({
      req,
      action: 'staff.suspend',
      entityType: 'Staff',
      entityId: instructor._id,
      reason,
      before,
      after: { isSuspended: true, isWithdrawn: instructor.isWithdrawn },
    });

    res.status(200).json({
      status: 'success',
      data: instructor,
      message: 'Staff member suspended successfully',
    });
  }
);

/**
 * @description Admin unsuspends a staff member
 * @route       PUT /api/v1/staff/admins/unsuspend/staff/:id
 * @access      Private
 */
export const adminUnsuspendinstructorCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const instructorId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(instructorId)) {
      throw new ValidationError('Invalid staff id');
    }

    const instructor = await Staff.findById(instructorId);
    if (!instructor) {
      throw new NotFoundError('Staff member not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const instructorDept = (instructor as any).department?.toString();
    if (scope && scope !== 'all' && instructorDept && !scope.includes(instructorDept)) {
      throw new AuthorizationError('Access denied for this staff member');
    }

    const before = { isSuspended: instructor.isSuspended, isWithdrawn: instructor.isWithdrawn };
    instructor.isSuspended = false;
    await instructor.save();

    await logAudit({
      req,
      action: 'staff.unsuspend',
      entityType: 'Staff',
      entityId: instructor._id,
      reason,
      before,
      after: { isSuspended: false, isWithdrawn: instructor.isWithdrawn },
    });

    res.status(200).json({
      status: 'success',
      data: instructor,
      message: 'Staff member unsuspended successfully',
    });
  }
);

/**
 * @description Admin withdrawl a staff member
 * @route       PUT /api/v1/staff/admins/withdraw/staff/:id
 * @access      Private
 */
export const adminWithdrawInstructorCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const instructorId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(instructorId)) {
      throw new ValidationError('Invalid staff id');
    }

    const instructor = await Staff.findById(instructorId);
    if (!instructor) {
      throw new NotFoundError('Staff member not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const instructorDept = (instructor as any).department?.toString();
    if (scope && scope !== 'all' && instructorDept && !scope.includes(instructorDept)) {
      throw new AuthorizationError('Access denied for this staff member');
    }

    const before = { isSuspended: instructor.isSuspended, isWithdrawn: instructor.isWithdrawn };
    instructor.isWithdrawn = true;
    await instructor.save();

    await logAudit({
      req,
      action: 'staff.withdraw',
      entityType: 'Staff',
      entityId: instructor._id,
      reason,
      before,
      after: { isSuspended: instructor.isSuspended, isWithdrawn: true },
    });

    res.status(200).json({
      status: 'success',
      data: instructor,
      message: 'Staff member withdrawn successfully',
    });
  }
);

/**
 * @description Admin Unwithdrawl a staff member
 * @route       PUT /api/v1/staff/admins/unwithdraw/staff/:id
 * @access      Private
 */
export const adminUnwithdrawInstructorCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const instructorId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(instructorId)) {
      throw new ValidationError('Invalid staff id');
    }

    const instructor = await Staff.findById(instructorId);
    if (!instructor) {
      throw new NotFoundError('Staff member not found');
    }

    const scope = req.departmentScope?.accessibleDepartmentIds;
    const instructorDept = (instructor as any).department?.toString();
    if (scope && scope !== 'all' && instructorDept && !scope.includes(instructorDept)) {
      throw new AuthorizationError('Access denied for this staff member');
    }

    const before = { isSuspended: instructor.isSuspended, isWithdrawn: instructor.isWithdrawn };
    instructor.isWithdrawn = false;
    await instructor.save();

    await logAudit({
      req,
      action: 'staff.unwithdraw',
      entityType: 'Staff',
      entityId: instructor._id,
      reason,
      before,
      after: { isSuspended: instructor.isSuspended, isWithdrawn: false },
    });

    res.status(200).json({
      status: 'success',
      data: instructor,
      message: 'Staff member unwithdrawn successfully',
    });
  }
);

/**
 * @description Admin suspends a learner
 * @route       PUT /api/v1/staff/admins/suspend/learner/:id
 * @access      Private
 */
export const adminSuspendLearnerCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const learnerId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(learnerId)) {
      throw new ValidationError('Invalid learner id');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new NotFoundError('Learner not found');
    }

    const before = { isSuspended: learner.isSuspended, isWithdrawn: learner.isWithdrawn };
    learner.isSuspended = true;
    await learner.save();

    await logAudit({
      req,
      action: 'learner.suspend',
      entityType: 'Learner',
      entityId: learner._id,
      reason,
      before,
      after: { isSuspended: true, isWithdrawn: learner.isWithdrawn },
    });

    res.status(200).json({
      status: 'success',
      data: learner,
      message: 'Learner suspended successfully',
    });
  }
);

/**
 * @description Admin unsuspends a learner
 * @route       PUT /api/v1/staff/admins/unsuspend/learner/:id
 * @access      Private
 */
export const adminUnsuspendLearnerCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const learnerId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(learnerId)) {
      throw new ValidationError('Invalid learner id');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new NotFoundError('Learner not found');
    }

    const before = { isSuspended: learner.isSuspended, isWithdrawn: learner.isWithdrawn };
    learner.isSuspended = false;
    await learner.save();

    await logAudit({
      req,
      action: 'learner.unsuspend',
      entityType: 'Learner',
      entityId: learner._id,
      reason,
      before,
      after: { isSuspended: false, isWithdrawn: learner.isWithdrawn },
    });

    res.status(200).json({
      status: 'success',
      data: learner,
      message: 'Learner unsuspended successfully',
    });
  }
);

/**
 * @description Admin withdraws a learner
 * @route       PUT /api/v1/staff/admins/withdraw/learner/:id
 * @access      Private
 */
export const adminWithdrawLearnerCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const learnerId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(learnerId)) {
      throw new ValidationError('Invalid learner id');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new NotFoundError('Learner not found');
    }

    const before = { isSuspended: learner.isSuspended, isWithdrawn: learner.isWithdrawn };
    learner.isWithdrawn = true;
    await learner.save();

    await logAudit({
      req,
      action: 'learner.withdraw',
      entityType: 'Learner',
      entityId: learner._id,
      reason,
      before,
      after: { isSuspended: learner.isSuspended, isWithdrawn: true },
    });

    res.status(200).json({
      status: 'success',
      data: learner,
      message: 'Learner withdrawn successfully',
    });
  }
);

/**
 * @description Admin unwithdraws a learner
 * @route       PUT /api/v1/staff/admins/unwithdraw/learner/:id
 * @access      Private
 */
export const adminUnwithdrawLearnerCtrl = expressAsyncHandler(
  async (req: Request<{ id: string }, {}, { reason?: string }>, res: Response): Promise<void> => {
    const learnerId = req.params.id;
    const reason = req.body?.reason;

    if (!mongoose.isValidObjectId(learnerId)) {
      throw new ValidationError('Invalid learner id');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new NotFoundError('Learner not found');
    }

    const before = { isSuspended: learner.isSuspended, isWithdrawn: learner.isWithdrawn };
    learner.isWithdrawn = false;
    await learner.save();

    await logAudit({
      req,
      action: 'learner.unwithdraw',
      entityType: 'Learner',
      entityId: learner._id,
      reason,
      before,
      after: { isSuspended: learner.isSuspended, isWithdrawn: false },
    });

    res.status(200).json({
      status: 'success',
      data: learner,
      message: 'Learner unwithdrawn successfully',
    });
  }
);

/**
 * @description Admin Publish Exam Results
 * @route       PUT /api/v1/staff/admins/publish/exam/:id
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
 * @route       PUT /api/v1/staff/admins/unpublish/exam/:id
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
