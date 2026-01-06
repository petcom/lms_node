/**
 * Migration Script: Remove Deprecated Arrays
 * DCV-020: Remove deprecated arrays from Program and Admin collections
 * 
 * This script removes the orphaned array fields that were replaced by
 * derived queries in ProgramQueryService (DCV-017):
 * 
 * - Program.learners → Now derived from ProgramEnrollment
 * - Program.instructors → Now derived from Course.primaryInstructors/secondaryInstructors
 * - Program.courses → Now derived from Course.find({ program })
 * - Admin.programs → Global admins access all programs via role
 * - Admin.academicTerms → Global admins access all via role
 * - Admin.yearGroups → Global admins access all via role
 * - Admin.academicYears → Global admins access all via role
 * - Admin.programLevels → Global admins access all via role
 * - Admin.courses → Global admins access all via role
 * - Admin.instructors → Global admins access all via role
 * - Admin.learners → Global admins access all via role
 * 
 * Usage:
 *   npx ts-node scripts/migrations/remove-deprecated-arrays.ts
 *   npx ts-node scripts/migrations/remove-deprecated-arrays.ts --dry-run
 * 
 * The script is idempotent - safe to run multiple times.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Parse arguments
const isDryRun = process.argv.includes('--dry-run');

interface MigrationResult {
  collection: string;
  fieldsRemoved: string[];
  documentsModified: number;
  skipped: boolean;
}

async function removeDeprecatedArrays(): Promise<void> {
  console.log('='.repeat(60));
  console.log('DCV-020: Remove Deprecated Arrays Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
  console.log('');

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error('MONGO_URI or DATABASE_URL environment variable is required');
  }

  await mongoose.connect(mongoUri);
  console.log(`Connected to: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`);
  console.log('');

  const results: MigrationResult[] = [];

  // 1. Remove arrays from Program collection
  console.log('Processing Program collection...');
  const programFieldsToRemove = ['learners', 'instructors', 'courses'];
  
  // Check if fields exist
  const sampleProgram = await mongoose.connection.db
    ?.collection('programs')
    .findOne({ $or: [
      { learners: { $exists: true } },
      { instructors: { $exists: true } },
      { courses: { $exists: true } },
    ]});

  if (sampleProgram) {
    if (!isDryRun) {
      const programResult = await mongoose.connection.db
        ?.collection('programs')
        .updateMany({}, { 
          $unset: { learners: 1, instructors: 1, courses: 1 } 
        });
      
      results.push({
        collection: 'programs',
        fieldsRemoved: programFieldsToRemove,
        documentsModified: programResult?.modifiedCount || 0,
        skipped: false,
      });
      
      console.log(`  ✓ Removed fields: ${programFieldsToRemove.join(', ')}`);
      console.log(`  ✓ Documents modified: ${programResult?.modifiedCount}`);
    } else {
      const count = await mongoose.connection.db
        ?.collection('programs')
        .countDocuments({ $or: [
          { learners: { $exists: true } },
          { instructors: { $exists: true } },
          { courses: { $exists: true } },
        ]});
      
      results.push({
        collection: 'programs',
        fieldsRemoved: programFieldsToRemove,
        documentsModified: count || 0,
        skipped: true,
      });
      
      console.log(`  [DRY RUN] Would remove fields: ${programFieldsToRemove.join(', ')}`);
      console.log(`  [DRY RUN] Would affect ${count} documents`);
    }
  } else {
    results.push({
      collection: 'programs',
      fieldsRemoved: [],
      documentsModified: 0,
      skipped: true,
    });
    console.log('  ⚪ No documents have deprecated fields - skipping');
  }
  console.log('');

  // 2. Remove arrays from Admin collection
  console.log('Processing Admin collection...');
  const adminFieldsToRemove = [
    'programs', 'academicTerms', 'yearGroups', 'academicYears',
    'programLevels', 'courses', 'instructors', 'learners'
  ];
  
  const sampleAdmin = await mongoose.connection.db
    ?.collection('admins')
    .findOne({ $or: adminFieldsToRemove.map(f => ({ [f]: { $exists: true } })) });

  if (sampleAdmin) {
    const unsetFields = adminFieldsToRemove.reduce((acc, f) => {
      acc[f] = 1;
      return acc;
    }, {} as Record<string, 1>);

    if (!isDryRun) {
      const adminResult = await mongoose.connection.db
        ?.collection('admins')
        .updateMany({}, { $unset: unsetFields });
      
      results.push({
        collection: 'admins',
        fieldsRemoved: adminFieldsToRemove,
        documentsModified: adminResult?.modifiedCount || 0,
        skipped: false,
      });
      
      console.log(`  ✓ Removed fields: ${adminFieldsToRemove.join(', ')}`);
      console.log(`  ✓ Documents modified: ${adminResult?.modifiedCount}`);
    } else {
      const count = await mongoose.connection.db
        ?.collection('admins')
        .countDocuments({ $or: adminFieldsToRemove.map(f => ({ [f]: { $exists: true } })) });
      
      results.push({
        collection: 'admins',
        fieldsRemoved: adminFieldsToRemove,
        documentsModified: count || 0,
        skipped: true,
      });
      
      console.log(`  [DRY RUN] Would remove fields: ${adminFieldsToRemove.join(', ')}`);
      console.log(`  [DRY RUN] Would affect ${count} documents`);
    }
  } else {
    results.push({
      collection: 'admins',
      fieldsRemoved: [],
      documentsModified: 0,
      skipped: true,
    });
    console.log('  ⚪ No documents have deprecated fields - skipping');
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('MIGRATION SUMMARY');
  console.log('='.repeat(60));
  for (const result of results) {
    const status = result.skipped ? '[SKIPPED/DRY]' : '[COMPLETE]';
    console.log(`${status} ${result.collection}:`);
    if (result.fieldsRemoved.length > 0) {
      console.log(`    Fields: ${result.fieldsRemoved.join(', ')}`);
      console.log(`    Documents: ${result.documentsModified}`);
    } else {
      console.log('    No changes needed');
    }
  }
  console.log('');

  if (isDryRun) {
    console.log('⚠️  This was a DRY RUN. No changes were made.');
    console.log('   Run without --dry-run to apply changes.');
  } else {
    console.log('✅ Migration completed successfully.');
  }

  await mongoose.disconnect();
}

// Run the migration
removeDeprecatedArrays()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
