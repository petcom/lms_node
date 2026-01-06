/**
 * DCV-030: Enrollment Migration Script
 * 
 * Migrates data from:
 * - Old ProgramEnrollment (status: 'active') → New ProgramEnrollment (status: 'enrolled')
 * - LearnerProgress → CourseEnrollmentCurrent / CourseEnrollmentActivity
 * 
 * Run with: npx ts-node scripts/migrate-enrollment-system.ts
 * 
 * Options:
 *   --dry-run    Preview changes without modifying database
 *   --verbose    Show detailed progress
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Models
import ProgramEnrollment from '../model/Academic/ProgramEnrollment';
import CourseEnrollmentCurrent from '../model/Academic/CourseEnrollmentCurrent';
import CourseEnrollmentActivity from '../model/Academic/CourseEnrollmentActivity';
import LearnerProgress from '../model/Content/LearnerProgress';
import CourseEnrollment from '../model/Academic/CourseEnrollment';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose');

function log(message: string, force = false): void {
  if (VERBOSE || force) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/lms';
  await mongoose.connect(uri);
  log('Connected to MongoDB', true);
}

async function migrateProgramEnrollmentStatus(): Promise<{ updated: number; skipped: number }> {
  log('Starting ProgramEnrollment status migration...', true);
  
  let updated = 0;
  let skipped = 0;
  
  // Find old 'active' status enrollments (if any exist after schema change)
  // The schema now uses 'enrolled' instead of 'active'
  const oldEnrollments = await mongoose.connection.collection('programenrollments')
    .find({ status: 'active' })
    .toArray();
  
  log(`Found ${oldEnrollments.length} ProgramEnrollments with 'active' status`);
  
  if (DRY_RUN) {
    log('DRY RUN: Would update these to "enrolled" status');
    return { updated: 0, skipped: oldEnrollments.length };
  }
  
  for (const enrollment of oldEnrollments) {
    try {
      await mongoose.connection.collection('programenrollments').updateOne(
        { _id: enrollment._id },
        { 
          $set: { 
            status: 'enrolled',
            statusHistory: [
              {
                status: 'enrolled',
                reason: 'Migrated from legacy "active" status',
                changedAt: new Date(),
              },
              ...(enrollment.statusHistory || []),
            ],
          },
        }
      );
      updated++;
      log(`Updated ProgramEnrollment ${enrollment._id}`);
    } catch (error) {
      console.error(`Failed to update ProgramEnrollment ${enrollment._id}:`, error);
      skipped++;
    }
  }
  
  return { updated, skipped };
}

async function migrateLegacyCourseEnrollments(): Promise<{ current: number; activity: number; skipped: number }> {
  log('Starting CourseEnrollment → CourseEnrollmentCurrent/Activity migration...', true);
  
  let currentCreated = 0;
  let activityCreated = 0;
  let skipped = 0;
  
  // Get all legacy course enrollments
  const legacyEnrollments = await CourseEnrollment.find({}).lean();
  log(`Found ${legacyEnrollments.length} legacy CourseEnrollments`);
  
  if (DRY_RUN) {
    const active = legacyEnrollments.filter(e => e.status === 'active');
    const completed = legacyEnrollments.filter(e => e.status === 'completed');
    const withdrawn = legacyEnrollments.filter(e => e.status === 'withdrawn');
    log(`DRY RUN: Would create ${active.length} Current, ${completed.length + withdrawn.length} Activity records`);
    return { current: 0, activity: 0, skipped: legacyEnrollments.length };
  }
  
  for (const legacy of legacyEnrollments) {
    try {
      // Find or create program enrollment for this learner/program
      let programEnrollment = await ProgramEnrollment.findOne({
        learner: legacy.learner,
        program: legacy.program,
      });
      
      if (!programEnrollment) {
        programEnrollment = await ProgramEnrollment.create({
          learner: legacy.learner,
          program: legacy.program,
          status: 'enrolled',
          enrolledAt: (legacy as any).createdAt || new Date(),
        });
        log(`Created ProgramEnrollment for learner ${legacy.learner}`);
      }
      
      if (legacy.status === 'active') {
        // Create CourseEnrollmentCurrent
        const existing = await CourseEnrollmentCurrent.findOne({
          learner: legacy.learner,
          course: legacy.course,
        });
        
        if (existing) {
          log(`CourseEnrollmentCurrent already exists for learner ${legacy.learner}, course ${legacy.course}`);
          skipped++;
          continue;
        }
        
        await CourseEnrollmentCurrent.create({
          learner: legacy.learner,
          course: legacy.course,
          programEnrollment: programEnrollment._id,
          enrolledAt: (legacy as any).startedAt || (legacy as any).createdAt || new Date(),
          progress: {},
          lastActivityAt: (legacy as any).updatedAt || new Date(),
        });
        currentCreated++;
        log(`Created CourseEnrollmentCurrent for learner ${legacy.learner}, course ${legacy.course}`);
        
      } else {
        // Create CourseEnrollmentActivity for completed/withdrawn
        const outcome = legacy.status === 'completed' ? 'passed' : 'withdrawn';
        
        const existing = await CourseEnrollmentActivity.findOne({
          learner: legacy.learner,
          course: legacy.course,
          completedAt: (legacy as any).completedAt,
        });
        
        if (existing) {
          log(`CourseEnrollmentActivity already exists for learner ${legacy.learner}, course ${legacy.course}`);
          skipped++;
          continue;
        }
        
        await CourseEnrollmentActivity.create({
          learner: legacy.learner,
          course: legacy.course,
          programEnrollment: programEnrollment._id,
          outcome,
          enrolledAt: (legacy as any).startedAt || (legacy as any).createdAt,
          completedAt: (legacy as any).completedAt || new Date(),
          finalScoring: legacy.progress ? {
            percentage: legacy.progress,
          } : undefined,
          creditsEarned: outcome === 'passed' ? 0 : 0, // Credits need manual assignment
          visibleToLearner: true,
        });
        activityCreated++;
        log(`Created CourseEnrollmentActivity for learner ${legacy.learner}, course ${legacy.course}`);
      }
    } catch (error) {
      console.error(`Failed to migrate CourseEnrollment ${legacy._id}:`, error);
      skipped++;
    }
  }
  
  return { current: currentCreated, activity: activityCreated, skipped };
}

async function migrateLearnerProgress(): Promise<{ migrated: number; skipped: number }> {
  log('Starting LearnerProgress → CourseEnrollmentCurrent progress migration...', true);
  
  let migrated = 0;
  let skipped = 0;
  
  // Get all learner progress records grouped by learner+course
  const progressRecords = await LearnerProgress.aggregate([
    {
      $group: {
        _id: { learnerId: '$learnerId', courseId: '$courseId' },
        records: { $push: '$$ROOT' },
        count: { $sum: 1 },
      },
    },
  ]);
  
  log(`Found ${progressRecords.length} learner+course combinations with progress`);
  
  if (DRY_RUN) {
    log('DRY RUN: Would update CourseEnrollmentCurrent records with progress data');
    return { migrated: 0, skipped: progressRecords.length };
  }
  
  for (const group of progressRecords) {
    try {
      const { learnerId, courseId } = group._id;
      if (!learnerId || !courseId) {
        skipped++;
        continue;
      }
      
      // Find the current enrollment
      const currentEnrollment = await CourseEnrollmentCurrent.findOne({
        learner: learnerId,
        course: courseId,
      });
      
      if (!currentEnrollment) {
        log(`No CourseEnrollmentCurrent found for learner ${learnerId}, course ${courseId}`);
        skipped++;
        continue;
      }
      
      // Convert LearnerProgress records to the new format
      const examAttempts: any[] = [];
      const scormAttempts: any[] = [];
      
      for (const record of group.records) {
        if (record.contentType === 'custom') {
          examAttempts.push({
            examId: record.contentId,
            examType: record.customType || 'practice',
            attemptNumber: record.attemptCount || 1,
            points: record.score,
            maxPoints: record.maxScore,
            percentage: record.maxScore ? (record.score / record.maxScore) * 100 : undefined,
            attemptedAt: record.lastActivityAt || record.updatedAt,
            timeSpent: record.timeSpentSec,
          });
        } else if (record.contentType === 'scorm') {
          scormAttempts.push({
            scormPackageId: record.contentId,
            attemptNumber: record.attemptCount || 1,
            score: record.score,
            scaledScore: record.maxScore ? record.score / record.maxScore : undefined,
            completionStatus: record.status === 'completed' ? 'completed' : 
                             record.status === 'in_progress' ? 'incomplete' : 'not-attempted',
            successStatus: record.passed === true ? 'passed' :
                          record.passed === false ? 'failed' : 'unknown',
            attemptedAt: record.lastActivityAt || record.updatedAt,
            timeSpent: record.timeSpentSec,
          });
        }
      }
      
      // Update the current enrollment with progress
      currentEnrollment.progress = {
        ...currentEnrollment.progress,
        examAttempts: [...(currentEnrollment.progress?.examAttempts || []), ...examAttempts],
        scormAttempts: [...(currentEnrollment.progress?.scormAttempts || []), ...scormAttempts],
      };
      currentEnrollment.lastActivityAt = new Date();
      
      await currentEnrollment.save();
      migrated++;
      log(`Migrated progress for learner ${learnerId}, course ${courseId}`);
      
    } catch (error) {
      console.error(`Failed to migrate LearnerProgress group:`, error);
      skipped++;
    }
  }
  
  return { migrated, skipped };
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('DCV-030: Enrollment System Migration');
  console.log('='.repeat(60));
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    await connectDB();
    
    // Step 1: Migrate ProgramEnrollment status values
    const programResults = await migrateProgramEnrollmentStatus();
    console.log(`\nProgramEnrollment: ${programResults.updated} updated, ${programResults.skipped} skipped`);
    
    // Step 2: Migrate legacy CourseEnrollment to Current/Activity
    const courseResults = await migrateLegacyCourseEnrollments();
    console.log(`CourseEnrollment → Current: ${courseResults.current} created`);
    console.log(`CourseEnrollment → Activity: ${courseResults.activity} created`);
    console.log(`CourseEnrollment: ${courseResults.skipped} skipped`);
    
    // Step 3: Migrate LearnerProgress data to CourseEnrollmentCurrent
    const progressResults = await migrateLearnerProgress();
    console.log(`LearnerProgress: ${progressResults.migrated} migrated, ${progressResults.skipped} skipped`);
    
    console.log('\n' + '='.repeat(60));
    console.log('Migration complete!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('Disconnected from MongoDB', true);
  }
}

main();
