import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Admin from '../../model/Staff/Admin';
import User from '../../model/Auth/User';
import generateToken from '../../utils/generateToken';
import { hashPassword, isPassMatched } from '../../utils/helpers';
import mongoose from 'mongoose';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';
import Staff from '../../model/Staff/Staff';
import Learner from '../../model/Academic/Learner';
import ProgramEnrollment from '../../model/Academic/ProgramEnrollment';
import logAudit from '../../utils/auditLogger';
import { normalizePersonName, PersonNameInput } from '../../utils/person';

const staffInScope = (staff: any, scope: string[] | 'all' | undefined) => {
  if (!scope || scope === 'all') return true;
  const membershipIds = Array.isArray(staff?.departmentMemberships)
    ? staff.departmentMemberships
        .map((membership: { departmentId?: any }) => membership.departmentId?.toString())
        .filter(Boolean)
    : [];
  if (membershipIds.length > 0) {
    return membershipIds.some((id: string) => scope.includes(id));
  }
  const staffDept = staff?.department?.toString();
  return staffDept ? scope.includes(staffDept) : false;
};

/**
 * DCV-029: Update ProgramEnrollment status instead of deprecated learner.programEnrolmentStatuses
 * Creates enrollment if not exists, updates status if exists
 */
const updateProgramEnrollmentStatus = async (
  learnerId: mongoose.Types.ObjectId,
  programId: mongoose.Types.ObjectId,
  status: 'enrolled' | 'on-leave' | 'withdrawn' | 'completed',
  reason?: string,
  userId?: mongoose.Types.ObjectId
) => {
  const now = new Date();
  
  // Find or create ProgramEnrollment
  let enrollment = await ProgramEnrollment.findOne({ learner: learnerId, program: programId });
  
  if (!enrollment) {
    enrollment = new ProgramEnrollment({
      learner: learnerId,
      program: programId,
      status,
      enrolledAt: now,
      statusHistory: [{
        status,
        reason,
        changedBy: userId,
        changedAt: now,
      }],
    });
  } else {
    const oldStatus = enrollment.status;
    enrollment.status = status;
    
    // Add to status history
    const statusHistory = enrollment.statusHistory || [];
    statusHistory.push({
      status,
      reason,
      changedBy: userId,
      changedAt: now,
    });
    enrollment.statusHistory = statusHistory;
    
    // Set leave/withdrawal dates if applicable
    if (status === 'on-leave') {
      enrollment.leaveStartDate = now;
      enrollment.leaveReason = reason;
    } else if (status === 'withdrawn') {
      enrollment.withdrawnAt = now;
      enrollment.withdrawalReason = reason;
    } else if (status === 'enrolled' && (oldStatus === 'on-leave' || oldStatus === 'withdrawn')) {
      // Returning from leave/withdrawal
      enrollment.leaveStartDate = undefined;
      enrollment.expectedReturnDate = undefined;
    }
  }
  
  await enrollment.save();
  return enrollment;
};

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
    const userFound = await User.findOne({ email });

    if (userFound) {
      res.status(401).json({ msg: 'Email is already registered' });
      return;
    }

    const hashedPassword = await hashPassword(password);
    // DCV-001: Use roles array instead of role field
    const user = await User.create({
      email,
      passwordHash: hashedPassword,
      roles: ['global-admin'],
      primaryRole: 'global-admin',
      status: 'active',
    });

    // DCV-039: Admin.email removed - email stored in User only
    const admin = await Admin.create({
      _id: user._id,
      name: normalizedName ?? name,
    });

    const sanitizedUser = {
      _id: admin._id,
      name: admin.name,
      email: user.email, // DCV-039: Get email from User, not Admin
      // DCV-001: Provide both role and roles for backward compatibility
      role: user.primaryRole,
      roles: user.roles,
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
    // DCV-001: Query using roles array
    const user = await User.findOne({ email, roles: 'global-admin' });

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid login credentials. Please try again.',
      });
      return;
    }

    // verify password
    const isMatched = await isPassMatched(password, user.passwordHash);

    if (!isMatched) {
      res.status(401).json({
        status: 'error',
        message: 'Invalid login credentials. Please try again.',
      });
    } else {
      // DCV-001: Use primaryRole for token generation
      const accessToken = generateToken(user._id.toString(), user.primaryRole);
      await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

      res.status(200).json({
        status: 'success',
        data: {
          token: accessToken,
          accessToken,
          // DCV-001: Provide both role and roles for backward compatibility
          role: user.primaryRole,
          roles: user.roles,
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
      ? await Admin.findById(adminId).select('-createdAt -updatedAt').lean()
      : null;

    if (!admin) {
      res.status(404).json({
        status: 'error',
        message: 'Admin not found',
      });
      return;
    }

    // DCV-039: Get email from User since Admin.email was removed
    const user = await User.findById(adminId).select('email').lean();

    const profile = {
      ...admin,
      email: user?.email,
    };

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
      name?: PersonNameInput;
      department?: mongoose.Types.ObjectId;
    } = {};
    const userUpdates: { email?: string; passwordHash?: string } = {};

    // if email is taken
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== req.userAuth?._id?.toString()) {
        throw new Error('This email already exists');
      }
      updateFields.email = email;
      userUpdates.email = email;
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
      userUpdates.passwordHash = await hashPassword(password);
      if (typeof name !== 'undefined') {
        updateFields.name = normalizedName ?? name;
      }
      // update profile
      const admin = await Admin.findByIdAndUpdate(
        req.userAuth?._id,
        updateFields,
        {
          new: true,
          runValidators: true,
        }
      );
      if (Object.keys(userUpdates).length > 0) {
        await User.findByIdAndUpdate(req.userAuth?._id, userUpdates);
      }
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
      if (Object.keys(userUpdates).length > 0) {
        await User.findByIdAndUpdate(req.userAuth?._id, userUpdates);
      }
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
    if (!staffInScope(instructor, scope)) {
      throw new AuthorizationError('Access denied for this staff member');
    }

    // DCV-040: Use status enum instead of isSuspended boolean
    const before = { status: instructor.status };
    instructor.status = 'suspended';
    await instructor.save();

    await logAudit({
      req,
      action: 'staff.suspend',
      entityType: 'Staff',
      entityId: instructor._id,
      reason,
      before,
      after: { status: 'suspended' },
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
    if (!staffInScope(instructor, scope)) {
      throw new AuthorizationError('Access denied for this staff member');
    }

    // DCV-040: Use status enum instead of isSuspended boolean
    const before = { status: instructor.status };
    instructor.status = 'active';
    await instructor.save();

    await logAudit({
      req,
      action: 'staff.unsuspend',
      entityType: 'Staff',
      entityId: instructor._id,
      reason,
      before,
      after: { status: 'active' },
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
    if (!staffInScope(instructor, scope)) {
      throw new AuthorizationError('Access denied for this staff member');
    }

    // DCV-040: Use status enum instead of isWithdrawn boolean
    const before = { status: instructor.status };
    instructor.status = 'withdrawn';
    await instructor.save();

    await logAudit({
      req,
      action: 'staff.withdraw',
      entityType: 'Staff',
      entityId: instructor._id,
      reason,
      before,
      after: { status: 'withdrawn' },
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
    if (!staffInScope(instructor, scope)) {
      throw new AuthorizationError('Access denied for this staff member');
    }

    // DCV-040: Use status enum instead of isWithdrawn boolean
    const before = { status: instructor.status };
    instructor.status = 'active';
    await instructor.save();

    await logAudit({
      req,
      action: 'staff.unwithdraw',
      entityType: 'Staff',
      entityId: instructor._id,
      reason,
      before,
      after: { status: 'active' },
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
  async (
    req: Request<{ id: string }, {}, { reason?: string; programId?: string }>,
    res: Response
  ): Promise<void> => {
    const learnerId = req.params.id;
    const reason = req.body?.reason;
    const programId = req.body?.programId;

    if (!mongoose.isValidObjectId(learnerId)) {
      throw new ValidationError('Invalid learner id');
    }
    if (!programId || !mongoose.isValidObjectId(programId)) {
      throw new ValidationError('Invalid program id');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new NotFoundError('Learner not found');
    }

    // DCV-029: Use ProgramEnrollment instead of deprecated programEnrolmentStatuses
    const enrollment = await updateProgramEnrollmentStatus(
      learner._id as mongoose.Types.ObjectId,
      new mongoose.Types.ObjectId(programId),
      'on-leave', // 'suspended' maps to 'on-leave' in new schema
      reason,
      (req as any).userAuth?._id
    );

    await logAudit({
      req,
      action: 'learner.suspend',
      entityType: 'Learner',
      entityId: learner._id,
      reason,
      before: {},
      after: { enrollmentStatus: enrollment.status },
    });

    res.status(200).json({
      status: 'success',
      data: { learner, enrollment },
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
  async (
    req: Request<{ id: string }, {}, { reason?: string; programId?: string }>,
    res: Response
  ): Promise<void> => {
    const learnerId = req.params.id;
    const reason = req.body?.reason;
    const programId = req.body?.programId;

    if (!mongoose.isValidObjectId(learnerId)) {
      throw new ValidationError('Invalid learner id');
    }
    if (!programId || !mongoose.isValidObjectId(programId)) {
      throw new ValidationError('Invalid program id');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new NotFoundError('Learner not found');
    }

    // DCV-029: Use ProgramEnrollment instead of deprecated programEnrolmentStatuses
    const enrollment = await updateProgramEnrollmentStatus(
      learner._id as mongoose.Types.ObjectId,
      new mongoose.Types.ObjectId(programId),
      'enrolled', // 'active' maps to 'enrolled' in new schema
      reason,
      (req as any).userAuth?._id
    );

    await logAudit({
      req,
      action: 'learner.unsuspend',
      entityType: 'Learner',
      entityId: learner._id,
      reason,
      before: {},
      after: { enrollmentStatus: enrollment.status },
    });

    res.status(200).json({
      status: 'success',
      data: { learner, enrollment },
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
  async (
    req: Request<{ id: string }, {}, { reason?: string; programId?: string }>,
    res: Response
  ): Promise<void> => {
    const learnerId = req.params.id;
    const reason = req.body?.reason;
    const programId = req.body?.programId;

    if (!mongoose.isValidObjectId(learnerId)) {
      throw new ValidationError('Invalid learner id');
    }
    if (!programId || !mongoose.isValidObjectId(programId)) {
      throw new ValidationError('Invalid program id');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new NotFoundError('Learner not found');
    }

    // DCV-029: Use ProgramEnrollment instead of deprecated programEnrolmentStatuses
    const enrollment = await updateProgramEnrollmentStatus(
      learner._id as mongoose.Types.ObjectId,
      new mongoose.Types.ObjectId(programId),
      'withdrawn',
      reason,
      (req as any).userAuth?._id
    );

    await logAudit({
      req,
      action: 'learner.withdraw',
      entityType: 'Learner',
      entityId: learner._id,
      reason,
      before: {},
      after: { enrollmentStatus: enrollment.status },
    });

    res.status(200).json({
      status: 'success',
      data: { learner, enrollment },
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
  async (
    req: Request<{ id: string }, {}, { reason?: string; programId?: string }>,
    res: Response
  ): Promise<void> => {
    const learnerId = req.params.id;
    const reason = req.body?.reason;
    const programId = req.body?.programId;

    if (!mongoose.isValidObjectId(learnerId)) {
      throw new ValidationError('Invalid learner id');
    }
    if (!programId || !mongoose.isValidObjectId(programId)) {
      throw new ValidationError('Invalid program id');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw new NotFoundError('Learner not found');
    }

    // DCV-029: Use ProgramEnrollment instead of deprecated programEnrolmentStatuses
    const enrollment = await updateProgramEnrollmentStatus(
      learner._id as mongoose.Types.ObjectId,
      new mongoose.Types.ObjectId(programId),
      'enrolled', // 'active' maps to 'enrolled' in new schema
      reason,
      (req as any).userAuth?._id
    );

    await logAudit({
      req,
      action: 'learner.unwithdraw',
      entityType: 'Learner',
      entityId: learner._id,
      reason,
      before: {},
      after: { enrollmentStatus: enrollment.status },
    });

    res.status(200).json({
      status: 'success',
      data: { learner, enrollment },
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
