import 'dotenv/config';
import mongoose from 'mongoose';
import dbConnect from '../config/dbConnect';
import ScormPackage from '../model/Scorm/ScormPackage';
import logger from '../utils/logger';

const DEFAULT_MODEL: 'Admin' | 'Teacher' | 'Student' =
  (process.env.SCORM_UPLOADED_BY_MODEL_DEFAULT as 'Admin' | 'Teacher' | 'Student') || 'Teacher';

async function run(): Promise<void> {
  await dbConnect();

  const filter = {
    $or: [
      { uploadedBy: { $exists: false } },
      { uploadedBy: null },
      { uploadedByModel: { $exists: false } },
      { uploadedByModel: null },
    ],
  };

  const packages = await ScormPackage.find(filter).lean();

  if (!packages.length) {
    logger.info('No SCORM packages require backfill');
    await mongoose.disconnect();
    return;
  }

  let updated = 0;

  for (const pkg of packages) {
    const update: Record<string, unknown> = {};

    if (!pkg.uploadedBy && pkg.createdBy) {
      update.uploadedBy = pkg.createdBy;
    }

    if (!pkg.uploadedByModel) {
      update.uploadedByModel = DEFAULT_MODEL;
    }

    if (Object.keys(update).length > 0) {    
      await ScormPackage.updateOne({ _id: pkg._id }, { $set: update });
      updated += 1;
    }
  }

  logger.info('SCORM package backfill completed', {
    matched: packages.length,
    updated,
    defaultModel: DEFAULT_MODEL,
  });

  await mongoose.disconnect();
}

run().catch((err: Error) => {
  logger.error('SCORM uploadedBy backfill failed', { error: err.message, stack: err.stack });
  mongoose.disconnect().finally(() => process.exit(1));
});
