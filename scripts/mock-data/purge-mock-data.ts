/**
 * Mock Data Purger
 * Removes all mock data from MongoDB by ID pattern
 * 
 * All mock data uses ObjectIds in the reserved range: 000000000000XXXX
 * Where XXXX is the entity prefix (2 hex chars) + sequence number
 * 
 * Usage: npm run seed:mongopurge
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import Department from '../../model/Academic/Department';
import Staff from '../../model/Staff/Staff';
import User from '../../model/Auth/User';
import Learner from '../../model/Academic/Learner';
import Program from '../../model/Academic/Program';
import ProgramLevel from '../../model/Academic/ProgramLevel';
import Course from '../../model/Content/Course';
import CustomContent from '../../model/Content/CustomContent';
import CourseContent from '../../model/Academic/CourseContent';
import RenderedCourse from '../../model/Content/RenderedCourse';
import ProgramEnrollment from '../../model/Academic/ProgramEnrollment';
import LearnerProgress from '../../model/Content/LearnerProgress';
import ContentAttempt from '../../model/Academic/ContentAttempt';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';

// Mock ID prefix pattern: 000000000000 (12 zeros)
const MOCK_ID_PREFIX = '000000000000';

// Build regex to match mock ObjectIds
const mockIdRegex = new RegExp(`^${MOCK_ID_PREFIX}`);

// Helper to delete by mock ID pattern
async function deleteMockData(model: mongoose.Model<any>, modelName: string) {
  try {
    // Find all documents with IDs matching mock pattern
    const result = await model.deleteMany({
      _id: { $regex: mockIdRegex }
    });
    console.log(`   ✅ Deleted ${result.deletedCount} ${modelName}`);
    return result.deletedCount;
  } catch (error) {
    console.error(`   ❌ Error deleting ${modelName}:`, error);
    return 0;
  }
}

async function purgeMockData() {
  console.log('🧹 Starting mock data purge...\n');
  console.log(`   Pattern: IDs starting with ${MOCK_ID_PREFIX}\n`);
  
  let totalDeleted = 0;

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Delete in reverse dependency order (child entities first)
    console.log('📦 Purging content attempts...');
    totalDeleted += await deleteMockData(ContentAttempt, 'content attempts');

    console.log('📦 Purging learner progress...');
    totalDeleted += await deleteMockData(LearnerProgress, 'learner progress');

    console.log('📦 Purging program enrollments...');
    totalDeleted += await deleteMockData(ProgramEnrollment, 'program enrollments');

    console.log('📦 Purging rendered courses...');
    totalDeleted += await deleteMockData(RenderedCourse, 'rendered courses');

    console.log('📦 Purging course content...');
    totalDeleted += await deleteMockData(CourseContent, 'course content');

    console.log('📦 Purging custom content...');
    totalDeleted += await deleteMockData(CustomContent, 'custom content');

    console.log('📦 Purging courses...');
    totalDeleted += await deleteMockData(Course, 'courses');

    console.log('📦 Purging program levels...');
    totalDeleted += await deleteMockData(ProgramLevel, 'program levels');

    console.log('📦 Purging programs...');
    totalDeleted += await deleteMockData(Program, 'programs');

    console.log('📦 Purging learners...');
    totalDeleted += await deleteMockData(Learner, 'learners');

    console.log('📦 Purging staff...');
    totalDeleted += await deleteMockData(Staff, 'staff');

    console.log('📦 Purging users...');
    totalDeleted += await deleteMockData(User, 'users');

    console.log('📦 Purging departments...');
    totalDeleted += await deleteMockData(Department, 'departments');

    console.log(`\n🎉 Mock data purge complete! Deleted ${totalDeleted} total records.`);

  } catch (error) {
    console.error('❌ Error purging mock data:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run if executed directly
purgeMockData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
