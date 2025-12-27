import mongoose from 'mongoose';
import logger from '../utils/logger';
import ensureMasterDepartment from './ensureMasterDepartment';

const dbConnect = async (): Promise<void> => {
  try {
    const mongoUrl = process.env.MONGO_URL;

    if (!mongoUrl) {
      throw new Error('MONGO_URL is not defined in environment variables');
    }

    await mongoose.connect(mongoUrl);
    logger.info('Database connected successfully');
    logger.info(`Database: ${mongoose.connection.name}`);
    logger.info(`Host: ${mongoose.connection.host}:${mongoose.connection.port}`);

    // Seed master department for scoped access control
    await ensureMasterDepartment();
  } catch (error) {
    const err = error as Error;
    logger.error('Database connection failed', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }

  // Database connection event handlers
  mongoose.connection.on('error', (err: Error) => {
    logger.error('Database error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Database disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('Database reconnected');
  });
};

export default dbConnect;
