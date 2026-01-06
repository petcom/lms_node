import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Staff from '../../model/Staff/Staff';
// DCV-016: Admin import removed - no longer pushing to admin.instructors array
import StaffRole from '../../model/Staff/StaffRole';
import User from '../../model/Auth/User';
import { hashPassword, isPassMatched } from '../../utils/helpers';
import generateToken from '../../utils/generateToken';
import mongoose from 'mongoose';
import { AuthorizationError, ValidationError } from '../../utils/errors';
import { normalizePersonName, PersonNameInput } from '../../utils/person';

// Request body interfaces
interface RegisterStaffBody {
  name: PersonNameInput;
  email: string;
  password: string;
  department?: string;
  departmentMemberships?: { departmentId: string; roles: string[] }[];
}

interface LoginStaffBody {
  email: string;
  password: string;
}

/**
 * EVIP Phase 1 (DCV-021): Removed email from Staff updates
 * Email stored only on User model, use getEmail() method
 * 
 * EVIP Phase 2 (DCV-022): Removed department from Staff updates
 * Use departmentMemberships instead
 */
interface UpdateStaffProfileBody {
  name?: PersonNameInput;
  password?: string;
  departmentMemberships?: { departmentId: string; roles: string[] }[];
}

/**
 * DCV-036: Removed deprecated fields from AdminUpdateStaffBody
 * - program, programLevel, course: Use Course.primaryInstructors/assistantInstructors
 * - academicYear: Context from Calendar/Class
 * - department: Derived from departmentMemberships[0].departmentId
 */
interface AdminUpdateStaffBody {
  departmentMemberships?: { departmentId: string; roles: string[] }[];
}

const normalizeDepartmentMemberships = async (
  departmentMemberships: { departmentId: string; roles: string[] }[] | undefined,
  scope: string[] | 'all' | undefined
) => {
  if (!Array.isArray(departmentMemberships) || departmentMemberships.length === 0) {
    return undefined;
  }

  const normalizedMap = new Map<string, string[]>();
  departmentMemberships.forEach((membership) => {
    const departmentId = membership?.departmentId?.toString();
    if (!departmentId || !mongoose.isValidObjectId(departmentId)) {
      throw new ValidationError('Invalid department id in departmentMemberships');
    }
    if (scope && scope !== 'all' && !scope.includes(departmentId)) {
      throw new AuthorizationError('Access denied for this department');
    }
    const roles = Array.isArray(membership.roles)
      ? membership.roles.map((role) => role.trim()).filter(Boolean)
      : [];
    const existing = normalizedMap.get(departmentId) || [];
    normalizedMap.set(departmentId, Array.from(new Set([...existing, ...roles])));
  });

  const allRoles = Array.from(normalizedMap.values()).flat();
  const uniqueRoles = Array.from(new Set(allRoles));
  if (uniqueRoles.length > 0) {
    const roleDocs = await StaffRole.find({ name: { $in: uniqueRoles } })
      .select('name')
      .lean();
    const validRoles = new Set(roleDocs.map((role) => role.name));
    const missing = uniqueRoles.filter((role) => !validRoles.has(role));
    if (missing.length > 0) {
      throw new ValidationError(`Unknown staff roles: ${missing.join(', ')}`);
    }
  }

  return Array.from(normalizedMap.entries()).map(([departmentId, roles]) => ({
    departmentId: new mongoose.Types.ObjectId(departmentId),
    roles,
  }));
};

/**
 * @description Admin Register Staff
 * @route       POST /api/v1/staff/admins/staff/register
 * @access      Private
 */
export const adminRegisterStaff = expressAsyncHandler(
  async (req: Request<{}, {}, RegisterStaffBody>, res: Response): Promise<void> => {
    const { name, email, password, department, departmentMemberships } = req.body;
    const normalizedName = normalizePersonName(name);

    // DCV-016: Admin validation via roleRestriction middleware, no need for Admin.findById
    // check if the staff member already exists
    const existingStaff = await User.findOne({ email });
    if (existingStaff) {
      throw new Error('Staff member already employed');
    }

    // hash password
    const hashedPassword = await hashPassword(password);
    // DCV-001: Use roles array instead of role field
    const user = await User.create({
      email,
      passwordHash: hashedPassword,
      roles: ['staff'],
      primaryRole: 'staff',
      status: 'active',
    });

    // determine department
    const scope = req.departmentScope?.accessibleDepartmentIds;
    const normalizedMemberships = await normalizeDepartmentMemberships(
      departmentMemberships,
      scope
    );
    // DCV-022: Staff.department removed - use departmentMemberships
    if (department) {
      if (!mongoose.isValidObjectId(department)) {
        throw new ValidationError('Invalid department id');
      }
      if (scope && scope !== 'all' && !scope.includes(department)) {
        throw new AuthorizationError('Access denied for this department');
      }
    }

    // staff created
    // DCV-021: email removed from Staff - stored in User only
    // DCV-022: department removed from Staff - using departmentMemberships
    const staffCreated = await Staff.create({
      _id: user._id,
      name: normalizedName ?? name,
      departmentMemberships: normalizedMemberships,
    });

    if (normalizedMemberships && normalizedMemberships.length > 0) {
      const roleUnion = Array.from(
        new Set(normalizedMemberships.flatMap((membership) => membership.roles))
      );
      await User.findByIdAndUpdate(user._id, { $set: { staffRoles: roleUnion } });
    }

    // DCV-016: Removed admin.instructors array push - global admins access all staff via role
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
    // DCV-001: Use roles array instead of role field
    const staffUser = await User.findOne({ email, roles: 'staff' });
    const staff = staffUser ? await Staff.findById(staffUser._id) : null;
    if (!staff) {
      res.json({ message: 'Invalid login credentials' });
      return;
    }

    // verify the password
    const isMatched = staffUser ? await isPassMatched(password, staffUser.passwordHash) : false;
    if (!isMatched) {
      res.json({ message: 'Invalid login credentials' });
    } else {
      // DCV-001: Use primaryRole for token generation
      const primaryRole = staffUser?.primaryRole || 'staff';
      const accessToken = generateToken(staff._id.toString(), primaryRole);
      await User.updateOne({ _id: staff._id }, { $set: { lastLoginAt: new Date() } });

      res.status(200).json({
        status: 'success',
        message: 'Staff logged in successfully',
        data: {
          accessToken,
          // DCV-001: Provide both legacy 'role' and new 'roles' for backward compatibility
          role: staffUser?.primaryRole || 'staff',
          roles: staffUser?.roles || ['staff'],
          staffRoles: staffUser?.staffRoles || [],
        },
      });
    }
  }
);

/**
 * @description Get All Staff
 * @route       GET /api/v1/staff/admins/staff
 * @access      Private global-admin only
 */
export const getAllStaffAdmin = expressAsyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(res.results);
  }
);

/**
 * @description Get Single Staff member
 * @route       GET /api/v1/staff/admins/staff/:staffID
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
    const staff = await Staff.findById(req.userAuth?._id).select('-createdAt -updatedAt');

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
 * 
 * EVIP Phase 1 (DCV-021): Email stored only on User model
 * EVIP Phase 2 (DCV-022): department field removed, use departmentMemberships
 */
export const staffUpdateProfile = expressAsyncHandler(
  async (req: Request<{}, {}, UpdateStaffProfileBody>, res: Response): Promise<void> => {
    const { name, password, departmentMemberships } = req.body;
    const normalizedName = normalizePersonName(name);
    
    // DCV-021/DCV-022: Staff model only stores name and departmentMemberships
    const updateFields: {
      name?: PersonNameInput;
      departmentMemberships?: {
        departmentId: mongoose.Types.ObjectId;
        roles: string[];
        createdAt?: Date;
        updatedAt?: Date;
      }[];
    } = {};
    
    // DCV-021: Email/password changes go to User model only
    const userUpdates: { passwordHash?: string } = {};

    // DCV-022: Handle departmentMemberships updates
    if (departmentMemberships && departmentMemberships.length > 0) {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      const normalized = await normalizeDepartmentMemberships(departmentMemberships, scope);
      if (normalized) {
        const now = new Date();
        updateFields.departmentMemberships = normalized.map((m) => ({
          ...m,
          createdAt: now,
          updatedAt: now,
        }));
      }
    }

    // check if user is updating password
    if (password) {
      userUpdates.passwordHash = await hashPassword(password);
    }
    
    if (typeof name !== 'undefined') {
      updateFields.name = normalizedName ?? name;
    }

    // Update Staff model (name and departmentMemberships only per DCV-021/DCV-022)
    const staff = await Staff.findByIdAndUpdate(
      req.userAuth?._id,
      Object.keys(updateFields).length > 0 ? updateFields : {},
      {
        new: true,
        runValidators: true,
      }
    );

    // DCV-021: Update password on User model only
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(req.userAuth?._id, userUpdates);
    }

    res.status(200).json({
      success: 'success',
      data: staff,
      message: 'Staff profile updated successfully',
    });
  }
);

/**
 * @description Admin updating Staff Profile
 * @route       UPDATE /api/v1/staff/admins/staff/:staffID/update
 * @access      Private admin only
 * 
 * DCV-022: department removed - use departmentMemberships
 * DCV-023: academicYear removed - context from Calendar/Class
 * DCV-036: course, program, programLevel removed - use Course assignment APIs
 */
export const adminUpdateStaff = expressAsyncHandler(
  async (
    req: Request<{ staffID: string }, {}, AdminUpdateStaffBody>,
    res: Response
  ): Promise<void> => {
    const { departmentMemberships } = req.body;

    // find staff
    const staffFound = await Staff.findById(req.params.staffID);
    if (!staffFound) {
      throw new Error('Staff member not found');
    }

    // DCV-040: check if staff member is withdrawn using status field
    if (staffFound.status === 'withdrawn') {
      throw new Error('Action denied, staff member is withdrawn');
    }

    if (departmentMemberships) {
      const scope = req.departmentScope?.accessibleDepartmentIds;
      const normalizedMemberships = await normalizeDepartmentMemberships(
        departmentMemberships,
        scope
      );
      if (normalizedMemberships) {
        staffFound.departmentMemberships = normalizedMemberships as any;
        await staffFound.save();
        const roleUnion = Array.from(
          new Set(normalizedMemberships.flatMap((membership) => membership.roles))
        );
        await User.findByIdAndUpdate(staffFound._id, { $set: { staffRoles: roleUnion } });
      }
    }

    // DCV-022, DCV-023, DCV-036: Legacy field assignments removed
    // - department: Now derived from departmentMemberships[0].departmentId
    // - academicYear: Contextual from Calendar/Class, not stored on Staff
    // - program, programLevel, course: Use Course.primaryInstructors/assistantInstructors

    res.status(200).json({
      success: 'success',
      data: staffFound,
      message: 'Staff profile updated successfully',
    });
  }
);

/**
 * @description Get staff members by department for instructor selector
 * @route       GET /api/v1/staff/by-department/:departmentId
 * @access      Private (staff, global-admin)
 */
export const getStaffByDepartment = expressAsyncHandler(
  async (req: Request<{ departmentId: string }>, res: Response): Promise<void> => {
    const { departmentId } = req.params;

    if (!mongoose.isValidObjectId(departmentId)) {
      throw new ValidationError('Invalid department ID');
    }

    // Check if department exists
    const Department = mongoose.model('Department');
    const department = await Department.findById(departmentId).lean();
    if (!department) {
      res.status(404).json({
        status: 'error',
        message: 'Department not found',
      });
      return;
    }

    // Find all staff in this department
    // DCV-022: Updated to use departmentMemberships instead of deprecated department field
    const staffList = await Staff.find({ 
      'departmentMemberships.departmentId': new mongoose.Types.ObjectId(departmentId) 
    })
      .select('name departmentMemberships')
      .lean();

    // DCV-021: Get emails from User collection
    const staffIds = staffList.map(s => s._id);
    const users = await User.find({ _id: { $in: staffIds } })
      .select('_id email')
      .lean();
    const emailMap = new Map(users.map(u => [u._id.toString(), u.email]));

    // Transform to expected format for instructor selector
    const formattedStaff = staffList.map((staff: any) => {
      const email = emailMap.get(staff._id.toString()) || '';
      return {
        _id: staff._id,
        displayName: staff.name?.first && staff.name?.last
          ? `${staff.name.first} ${staff.name.last}`
          : email,
        firstName: staff.name?.first || '',
        lastName: staff.name?.last || '',
        email,
      };
    });

    res.status(200).json({
      status: 'success',
      data: formattedStaff,
    });
  }
);
