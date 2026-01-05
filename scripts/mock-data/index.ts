/**
 * Mock Data Index
 * Aggregates all mock data for seeding
 */

import mongoose from 'mongoose';

// Helper to generate predictable mock ObjectIds
export const mockId = (prefix: string, num: number): mongoose.Types.ObjectId => {
  // Pad prefix to 2 chars, num to 4 chars
  const hexNum = num.toString(16).padStart(4, '0');
  const hex = `000000000000${prefix}${hexNum}`;
  return new mongoose.Types.ObjectId(hex);
};

// Entity prefixes for ObjectId generation
export const PREFIXES = {
  DEPARTMENT: 'd0',
  STAFF: 's0',
  USER: 'u0',
  LEARNER: 'l0',
  PROGRAM: 'p0',
  PROGRAM_LEVEL: 'a1', // 'pl' has invalid hex, using 'a1'
  COURSE: 'c0',
  COURSE_CONTENT: 'cc',
  CUSTOM_CONTENT: 'b1', // 'cu' has invalid hex, using 'b1'
  PROGRAM_ENROLLMENT: 'e1', // 'pe' has invalid hex, using 'e1'
  RENDERED_COURSE: 'fc', // 'rc' has invalid hex, using 'fc'
  LEARNER_PROGRESS: 'b2', // 'lp' has invalid hex, using 'b2'
  CONTENT_ATTEMPT: 'ca',
  QUESTION: 'f0', // 'q0' has invalid hex, using 'f0'
} as const;

// Check if an ObjectId is a mock ID (starts with our pattern)
export const isMockId = (id: mongoose.Types.ObjectId | string): boolean => {
  const hex = id.toString();
  return hex.startsWith('000000000000');
};

// Export all data
export { departments } from './departments';
export { users, staff } from './staff';
export { learners } from './learners';
export { programs } from './programs';
export { programLevels } from './program-levels';
export { courses } from './courses';
export { customContent, questions } from './custom-content';
export { courseContent } from './course-content';
export { renderedCourses } from './rendered-courses';
export { programEnrollments } from './enrollments';
export { learnerProgress } from './learner-progress';
export { contentAttempts } from './content-attempts';
