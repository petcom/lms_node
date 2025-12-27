import mongoose from 'mongoose';
import Department from '../model/Academic/Department';
import Admin from '../model/Staff/Admin';
import Teacher from '../model/Staff/Teacher';
import Program from '../model/Academic/Program';
import Subject from '../model/Academic/Subject';
import ClassLevel from '../model/Academic/ClassLevel';
import ScormPackage from '../model/Scorm/ScormPackage';
import logger from '../utils/logger';

const DEFAULT_MASTER_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

export const ensureMasterDepartment = async (): Promise<void> => {
  try {
    const existing = await Department.findOne({ level: 'master' }).lean();
    const masterId = new mongoose.Types.ObjectId(DEFAULT_MASTER_ID);

    if (!existing) {
      await Department.create({
        _id: masterId,
        name: 'Master Department',
        code: 'MASTER',
        level: 'master',
        parent: null,
        ancestors: [],
      });
      logger.info('Seeded Master Department');
    }

    // Backfill existing records without department to master
    const bulkOps = [
      Admin.updateMany({ department: { $exists: false } }, { $set: { department: masterId } }),
      Teacher.updateMany({ department: { $exists: false } }, { $set: { department: masterId } }),
      Program.updateMany({ department: { $exists: false } }, { $set: { department: masterId } }),
      Subject.updateMany({ department: { $exists: false } }, { $set: { department: masterId } }),
      ClassLevel.updateMany({ department: { $exists: false } }, { $set: { department: masterId } }),
      ScormPackage.updateMany({ department: { $exists: false } }, { $set: { department: masterId } }),
    ];

    await Promise.all(bulkOps);
  } catch (err) {
    logger.error('Failed to ensure Master Department', { error: (err as Error).message });
    throw err;
  }
};

export default ensureMasterDepartment;
