import express from 'express';
import multer from 'multer';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { isInstructorOrAdmin, isAdmin } from '../../middlewares/roleRestriction';
import departmentScope from '../../middlewares/departmentScope';
import {
  uploadPackage,
  getAllPackages,
  getPackage,
  updatePackage,
  deletePackage,
  assignPackage,
  unassignPackage,
  getMyAssignments,
  publishPackage,
  unpublishPackage,
  clonePackage,
} from '../../controller/scorm/scormPackageCtrl';

const scormPackageRouter = express.Router();

// Configure multer for file upload (memory storage for SCORM packages)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.SCORM_MAX_FILE_SIZE) || 500 * 1024 * 1024, // 500MB default
  },
  fileFilter: (_req, file, cb) => {
    if (process.env.NODE_ENV === 'test') {
      return cb(null, true);
    }

    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
});

// Learner routes
scormPackageRouter.get('/my-assignments', isAuthenticated(), getMyAssignments);

// Package management routes (Instructor/Admin)
scormPackageRouter.post(
  '/',
  isAuthenticated(),
  departmentScope(),
  isInstructorOrAdmin,
  upload.single('file'),
  uploadPackage
);

scormPackageRouter.get('/', isAuthenticated(), departmentScope(), isInstructorOrAdmin, getAllPackages);

scormPackageRouter.get('/:id', isAuthenticated(), departmentScope(), getPackage);

scormPackageRouter.put(
  '/:id',
  isAuthenticated(),
  departmentScope(),
  isInstructorOrAdmin,
  updatePackage
);

scormPackageRouter.delete(
  '/:id',
  isAuthenticated(),
  departmentScope(),
  isInstructorOrAdmin,
  deletePackage
);

// Clone global package into a department (Admin only)
scormPackageRouter.post('/:id/clone', isAuthenticated(), departmentScope(), isAdmin, clonePackage);

// Assignment routes (Instructor/Admin)
scormPackageRouter.post(
  '/:id/assign',
  isAuthenticated(),
  departmentScope(),
  isInstructorOrAdmin,
  assignPackage
);

scormPackageRouter.post(
  '/:id/unassign',
  isAuthenticated(),
  departmentScope(),
  isInstructorOrAdmin,
  unassignPackage
);

// Publish controls (Instructor/Admin)
scormPackageRouter.post(
  '/:id/publish',
  isAuthenticated(),
  departmentScope(),
  isInstructorOrAdmin,
  publishPackage
);
scormPackageRouter.post(
  '/:id/unpublish',
  isAuthenticated(),
  departmentScope(),
  isInstructorOrAdmin,
  unpublishPackage
);

export default scormPackageRouter;
