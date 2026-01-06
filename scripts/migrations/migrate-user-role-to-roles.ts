/**
 * DCV-010: Migrate User.role to User.roles Array
 * 
 * This script migrates existing User documents from the legacy `role` field
 * to the new `roles` array format.
 * 
 * Migration:
 * - role: 'staff' → roles: ['staff'], primaryRole: 'staff'
 * - role: 'learner' → roles: ['learner'], primaryRole: 'learner'
 * - role: 'global-admin' → roles: ['global-admin'], primaryRole: 'global-admin'
 * - subroles → staffRoles (rename)
 * 
 * Run with: npx ts-node scripts/migrations/migrate-user-role-to-roles.ts
 * 
 * Options:
 *   --dry-run    Preview changes without modifying database
 *   --verbose    Show detailed progress
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

interface MigrationStats {
  total: number;
  migrated: number;
  alreadyMigrated: number;
  errors: number;
  subrolesToStaffRoles: number;
}

async function migrateRoleToRoles(): Promise<MigrationStats> {
  log('Starting User.role → User.roles migration...', true);
  
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    alreadyMigrated: 0,
    errors: 0,
    subrolesToStaffRoles: 0,
  };
  
  const usersCollection = mongoose.connection.collection('users');
  
  // Get all users
  const allUsers = await usersCollection.find({}).toArray();
  stats.total = allUsers.length;
  log(`Found ${stats.total} total users`);
  
  for (const user of allUsers) {
    try {
      const updates: any = {};
      const unsets: any = {};
      let needsUpdate = false;
      
      // Check if user has legacy 'role' field and not yet migrated
      if (user.role && (!user.roles || user.roles.length === 0)) {
        updates.roles = [user.role];
        updates.primaryRole = user.role;
        unsets.role = '';
        needsUpdate = true;
        log(`User ${user._id}: Migrating role '${user.role}' → roles: ['${user.role}']`);
      } else if (user.roles && user.roles.length > 0) {
        stats.alreadyMigrated++;
        log(`User ${user._id}: Already migrated (has roles array)`);
      } else if (!user.role && (!user.roles || user.roles.length === 0)) {
        // User has neither role nor roles - set default
        updates.roles = ['learner'];
        updates.primaryRole = 'learner';
        needsUpdate = true;
        log(`User ${user._id}: No role found, setting default roles: ['learner']`);
      }
      
      // Check for subroles → staffRoles rename
      if (user.subroles && !user.staffRoles) {
        updates.staffRoles = user.subroles;
        unsets.subroles = '';
        needsUpdate = true;
        stats.subrolesToStaffRoles++;
        log(`User ${user._id}: Renaming subroles → staffRoles`);
      }
      
      // Ensure primaryRole is set if missing
      if (user.roles && user.roles.length > 0 && !user.primaryRole) {
        updates.primaryRole = user.roles[0];
        needsUpdate = true;
        log(`User ${user._id}: Setting missing primaryRole to '${user.roles[0]}'`);
      }
      
      if (needsUpdate) {
        if (DRY_RUN) {
          log(`DRY RUN: Would update user ${user._id}`);
          log(`  $set: ${JSON.stringify(updates)}`);
          if (Object.keys(unsets).length > 0) {
            log(`  $unset: ${JSON.stringify(unsets)}`);
          }
        } else {
          const updateOp: any = {};
          if (Object.keys(updates).length > 0) {
            updateOp.$set = updates;
          }
          if (Object.keys(unsets).length > 0) {
            updateOp.$unset = unsets;
          }
          
          await usersCollection.updateOne(
            { _id: user._id },
            updateOp
          );
        }
        stats.migrated++;
      }
    } catch (error) {
      console.error(`Error migrating user ${user._id}:`, error);
      stats.errors++;
    }
  }
  
  return stats;
}

async function verifyMigration(): Promise<{ valid: number; invalid: number }> {
  log('Verifying migration...', true);
  
  const usersCollection = mongoose.connection.collection('users');
  
  // Check for any remaining legacy 'role' fields
  const legacyRoleCount = await usersCollection.countDocuments({
    role: { $exists: true },
  });
  
  // Check for users with valid roles array
  const validRolesCount = await usersCollection.countDocuments({
    roles: { $exists: true, $type: 'array', $not: { $size: 0 } },
  });
  
  // Check for remaining subroles (should be renamed to staffRoles)
  const legacySubrolesCount = await usersCollection.countDocuments({
    subroles: { $exists: true },
  });
  
  if (legacyRoleCount > 0) {
    console.warn(`⚠️  ${legacyRoleCount} users still have legacy 'role' field`);
  }
  
  if (legacySubrolesCount > 0) {
    console.warn(`⚠️  ${legacySubrolesCount} users still have legacy 'subroles' field`);
  }
  
  return {
    valid: validRolesCount,
    invalid: legacyRoleCount + legacySubrolesCount,
  };
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('DCV-010: User.role → User.roles Migration');
  console.log('='.repeat(60));
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    await connectDB();
    
    // Run migration
    const stats = await migrateRoleToRoles();
    
    console.log('\n' + '-'.repeat(40));
    console.log('Migration Results:');
    console.log('-'.repeat(40));
    console.log(`Total users:           ${stats.total}`);
    console.log(`Migrated:              ${stats.migrated}`);
    console.log(`Already migrated:      ${stats.alreadyMigrated}`);
    console.log(`subroles → staffRoles: ${stats.subrolesToStaffRoles}`);
    console.log(`Errors:                ${stats.errors}`);
    
    // Verify migration
    if (!DRY_RUN) {
      const verification = await verifyMigration();
      console.log('\n' + '-'.repeat(40));
      console.log('Verification:');
      console.log('-'.repeat(40));
      console.log(`Valid users:   ${verification.valid}`);
      console.log(`Invalid users: ${verification.invalid}`);
      
      if (verification.invalid === 0) {
        console.log('\n✅ Migration completed successfully!');
      } else {
        console.log('\n⚠️  Migration completed with warnings - see above');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('Disconnected from MongoDB', true);
  }
}

main();
