import express from 'express';
import multer from 'multer';
import isAuthenticated from '../../middlewares/isAuthenticated';
import { isTeacherOrAdmin } from '../../middlewares/roleRestriction';
import {
  uploadPackage,
  getAllPackages,
  getPackage,
  updatePackage,
  deletePackage,
  assignPackage,
  unassignPackage,
  getMyAssignments,
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

// Student routes
scormPackageRouter.get('/my-assignments', isAuthenticated(), getMyAssignments);

// Package management routes (Teacher/Admin)
scormPackageRouter.post(
  '/',
  isAuthenticated(),
  isTeacherOrAdmin,
  upload.single('package'),
  uploadPackage
);

scormPackageRouter.get('/', isAuthenticated(), isTeacherOrAdmin, getAllPackages);

scormPackageRouter.get('/:id', isAuthenticated(), getPackage);

scormPackageRouter.put('/:id', isAuthenticated(), isTeacherOrAdmin, updatePackage);

scormPackageRouter.delete('/:id', isAuthenticated(), isTeacherOrAdmin, deletePackage);

// Assignment routes (Teacher/Admin)
scormPackageRouter.post('/:id/assign', isAuthenticated(), isTeacherOrAdmin, assignPackage);

scormPackageRouter.post(
  '/:id/unassign',
  isAuthenticated(),
  isTeacherOrAdmin,
  unassignPackage
);

export default scormPackageRouter;
