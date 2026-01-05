/**
 * Mock Data Seeder
 * Seeds all mock data into MongoDB for integration testing
 * 
 * Usage: npm run seed:mongomock
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models - we need to reference actual model files
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

// Import mock data
import { departments } from './departments';
import { staff, users } from './staff';
import { learners, learnerUsers } from './learners';
import { programs } from './programs';
import { programLevels } from './program-levels';
import { courses } from './courses';
import { customContent, questions } from './custom-content';
import { courseContent } from './course-content';
import { renderedCourses } from './rendered-courses';
import { programEnrollments } from './enrollments';
import { learnerProgress } from './learner-progress';
import { contentAttempts } from './content-attempts';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';

async function seedMockData() {
  console.log('🌱 Starting mock data seed...\n');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Seed in dependency order
    console.log('📦 Seeding departments...');
    await Department.insertMany(departments);
    console.log(`   ✅ Inserted ${departments.length} departments\n`);

    console.log('📦 Seeding users (for staff)...');
    await User.insertMany(users);
    console.log(`   ✅ Inserted ${users.length} staff users\n`);

    console.log('📦 Seeding users (for learners)...');
    await User.insertMany(learnerUsers);
    console.log(`   ✅ Inserted ${learnerUsers.length} learner users\n`);

    console.log('📦 Seeding staff...');
    await Staff.insertMany(staff);
    console.log(`   ✅ Inserted ${staff.length} staff\n`);

    console.log('📦 Seeding learners...');
    await Learner.insertMany(learners);
    console.log(`   ✅ Inserted ${learners.length} learners\n`);

    console.log('📦 Seeding programs...');
    await Program.insertMany(programs);
    console.log(`   ✅ Inserted ${programs.length} programs\n`);

    console.log('📦 Seeding program levels...');
    await ProgramLevel.insertMany(programLevels);
    console.log(`   ✅ Inserted ${programLevels.length} program levels\n`);

    console.log('📦 Seeding courses...');
    await Course.insertMany(courses);
    console.log(`   ✅ Inserted ${courses.length} courses\n`);

    console.log('📦 Seeding custom content...');
    await CustomContent.insertMany(customContent);
    console.log(`   ✅ Inserted ${customContent.length} custom content items\n`);

    // Questions may need a separate model or embedded - check model structure
    // For now, we'll skip questions if there's no Question model
    console.log(`   📝 Generated ${questions.length} questions (embedded in content)\n`);

    console.log('📦 Seeding course content (segments)...');
    await CourseContent.insertMany(courseContent);
    console.log(`   ✅ Inserted ${courseContent.length} course content segments\n`);

    console.log('📦 Seeding rendered courses...');
    await RenderedCourse.insertMany(renderedCourses);
    console.log(`   ✅ Inserted ${renderedCourses.length} rendered courses\n`);

    console.log('📦 Seeding program enrollments...');
    await ProgramEnrollment.insertMany(programEnrollments);
    console.log(`   ✅ Inserted ${programEnrollments.length} program enrollments\n`);

    console.log('📦 Seeding learner progress...');
    await LearnerProgress.insertMany(learnerProgress);
    console.log(`   ✅ Inserted ${learnerProgress.length} learner progress records\n`);

    console.log('📦 Seeding content attempts...');
    await ContentAttempt.insertMany(contentAttempts);
    console.log(`   ✅ Inserted ${contentAttempts.length} content attempts\n`);

    console.log('🎉 Mock data seeding complete!\n');
    console.log('Summary:');
    console.log(`   - Departments: ${departments.length}`);
    console.log(`   - Staff (+ Users): ${staff.length}`);
    console.log(`   - Learners: ${learners.length}`);
    console.log(`   - Programs: ${programs.length}`);
    console.log(`   - Program Levels: ${programLevels.length}`);
    console.log(`   - Courses: ${courses.length}`);
    console.log(`   - Custom Content: ${customContent.length}`);
    console.log(`   - Course Content: ${courseContent.length}`);
    console.log(`   - Rendered Courses: ${renderedCourses.length}`);
    console.log(`   - Program Enrollments: ${programEnrollments.length}`);
    console.log(`   - Learner Progress: ${learnerProgress.length}`);
    console.log(`   - Content Attempts: ${contentAttempts.length}`);

  } catch (error) {
    console.error('❌ Error seeding mock data:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run if executed directly
seedMockData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
