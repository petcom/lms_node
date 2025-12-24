import { Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import Admin from '../../model/Staff/Admin';
import generateToken from '../../utils/generateToken';
import { hashPassword, isPassMatched } from '../../utils/helpers';

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
}

/**
 * @description Register admins
 * @route       POST /api/v1/admins/register
 * @access      Private
 */
export const registerAdminCtrl = expressAsyncHandler(async (req: Request<{}, {}, RegisterAdminBody>, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  // Check if admin already exists in the database
  const adminFound = await Admin.findOne({ email });

  if (adminFound) {
    res.status(401).json({ msg: "Email is already registered" });
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
    status: "success",
    data: sanitizedUser,
    message: "Admin registered successfully. Glad you are here.",
  });
});

/**
 * @description login admins
 * @route       POST /api/v1/admins/login
 * @access      Public
 */
export const loginAdminCtrl = expressAsyncHandler(async (req: Request<{}, {}, LoginAdminBody>, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const user = await Admin.findOne({ email });

  if (!user) {
    res.status(401).json({
      status: "error",
      message: "Invalid login credentials. Please try again.",
    });
    return;
  }

  // verify password
  const isMatched = await isPassMatched(password, user.password);

  if (!isMatched) {
    res.status(401).json({
      status: "error",
      message: "Invalid login credentials. Please try again.",
    });
  } else {
    const role = user.role || 'admin';
    const accessToken = generateToken(user._id.toString(), role);

    res.status(200).json({
      status: "success",
      data: {
        token: accessToken,
        accessToken,
        role,
      },
      message: "Admin logged in successfully. Welcome back!",
    });
  }
});

/**
 * @description Get all admins
 * @route       GET /api/v1/admins
 * @access      Private
 */
export const getAdminsCtrl = expressAsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json(res.results);
});

/**
 * @description Get Admin Profile
 * @route       GET /api/v1/admins/profile
 * @access      Private
 */
export const getAdminProfileCtrl = expressAsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const adminId = req.userAuth?._id;
  const admin = adminId
    ? await Admin.findById(adminId).select("-password -createdAt -updatedAt").lean()
    : null;

  const profile = admin || req.userAuth;

  if (!profile) {
    res.status(404).json({
      status: "error",
      message: "Admin not found",
    });
    return;
  }

  res.status(200).json({
    status: "success",
    data: profile,
    message: "Admin Profile fetched successfully",
  });
});

/**
 * @description Update Admin
 * @route       UPDATE /api/v1/admins/:id
 * @access      Private
 */
export const updateAdminCtrl = expressAsyncHandler(async (req: Request<{}, {}, UpdateAdminBody>, res: Response): Promise<void> => {
  const { email, name, password } = req.body;
  
  // if email is taken
  if (email) {
    const emailExists = await Admin.findOne({ email });
    if (emailExists) {
      throw new Error("This email already exists");
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
      },
      {
        new: true,
        runValidators: true,
      }
    );
    res.status(200).json({
      success: "success",
      data: admin,
      message: "Admin profile updated successfully",
    });
  } else {
    // update user email and name
    const admin = await Admin.findByIdAndUpdate(
      req.userAuth?._id,
      {
        email,
        name,
      },
      {
        new: true,
        runValidators: true,
      }
    );
    res.status(200).json({
      success: "success",
      data: admin,
      message: "Admin profile updated successfully",
    });
  }
});

/**
 * @description Admin suspends a teacher
 * @route       PUT /api/v1/admins/suspend/teacher/:id
 * @access      Private
 */
export const adminSuspendTeacherCtrl = (_req: Request, res: Response): void => {
  try {
    res.status(201).json({
      status: "success",
      data: "Admin has Suspended teacher successfully",
    });
  } catch (error) {
    res.json({
      status: "failed",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @description Admin unsuspends a teacher
 * @route       PUT /api/v1/admins/unsuspend/teacher/:id
 * @access      Private
 */
export const adminUnsuspendteacherCtrl = (_req: Request, res: Response): void => {
  try {
    res.status(201).json({
      status: "success",
      data: "Admin has Unsuspended teacher successfully",
    });
  } catch (error) {
    res.json({
      status: "failed",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @description Admin withdrawl a teacher
 * @route       PUT /api/v1/admins/withdraw/teacher/:id
 * @access      Private
 */
export const adminWithdrawTeacherCtrl = (_req: Request, res: Response): void => {
  try {
    res.status(201).json({
      status: "success",
      data: "Admin has withdrawn teacher successfully",
    });
  } catch (error) {
    res.json({
      status: "failed",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @description Admin Unwithdrawl a teacher
 * @route       PUT /api/v1/admins/unwithdraw/teacher/:id
 * @access      Private
 */
export const adminUnwithdrawTeacherCtrl = (_req: Request, res: Response): void => {
  try {
    res.status(201).json({
      status: "success",
      data: "Admin has Unwithdrawn teacher successfully",
    });
  } catch (error) {
    res.json({
      status: "failed",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @description Admin Publish Exam Results
 * @route       PUT /api/v1/admins/publish/exam/:id
 * @access      Private
 */
export const adminPublishResultsCtrl = (_req: Request, res: Response): void => {
  try {
    res.status(201).json({
      status: "success",
      data: "Admin has published exam result(s) successfully",
    });
  } catch (error) {
    res.json({
      status: "failed",
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
      status: "success",
      data: "Admin has Unpublished exam result(s) successfully",
    });
  } catch (error) {
    res.json({
      status: "failed",
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
