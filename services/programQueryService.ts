/**
 * Program Query Service
 * DCV-017: Provides cached derived queries for program-related data
 * 
 * This service replaces the removed orphaned arrays (Program.learners,
 * Program.instructors, Program.courses) with derived queries that compute
 * the data from the authoritative sources:
 * - learners: from ProgramEnrollment
 * - instructors: from Course.primaryInstructors/secondaryInstructors
 * - courses: from Course.find({ program })
 */
import mongoose from 'mongoose';
import ProgramEnrollment from '../model/Academic/ProgramEnrollment';
import Course from '../model/Content/Course';
import Staff from '../model/Staff/Staff';
import { ILearner, IStaff, ICourse } from '../types/models-types';

// Optional Redis import - service works without it
let redis: any = null;
try {
  redis = require('../config/redis').redis;
} catch (e) {
  // Redis not available, queries will run without caching
}

const CACHE_TTL = 300; // 5 minutes

export class ProgramQueryService {
  private cacheEnabled: boolean;

  constructor() {
    this.cacheEnabled = redis !== null;
  }

  /**
   * Get learners enrolled in a program (active enrollments only)
   * Replaces deprecated Program.learners array
   */
  async getLearners(programId: string): Promise<ILearner[]> {
    const cacheKey = `program:${programId}:learners`;
    
    // Try cache first
    if (this.cacheEnabled) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        // Cache miss or error, continue to query
      }
    }
    
    // Query ProgramEnrollment for enrolled learners
    // DCV-026: status changed from 'active' to 'enrolled'
    const enrollments = await ProgramEnrollment.find({ 
      program: new mongoose.Types.ObjectId(programId), 
      status: 'enrolled' 
    }).populate('learner');
    
    const learners = enrollments
      .map(e => e.learner as unknown as ILearner)
      .filter(l => l !== null && l !== undefined);
    
    // Cache the result
    if (this.cacheEnabled) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(learners));
      } catch (e) {
        // Cache write failed, continue
      }
    }
    
    return learners;
  }
  
  /**
   * Get instructors for a program (from all courses in program levels)
   * Replaces deprecated Program.instructors array
   */
  async getInstructors(programId: string): Promise<IStaff[]> {
    const cacheKey = `program:${programId}:instructors`;
    
    // Try cache first
    if (this.cacheEnabled) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        // Cache miss or error, continue to query
      }
    }
    
    // Get all courses for this program
    const courses = await Course.find({ 
      program: new mongoose.Types.ObjectId(programId),
      isArchived: { $ne: true }
    });
    
    // Collect unique instructor IDs
    const instructorIds = new Set<string>();
    for (const course of courses) {
      for (const id of course.primaryInstructors || []) {
        instructorIds.add(id.toString());
      }
      for (const id of course.secondaryInstructors || []) {
        instructorIds.add(id.toString());
      }
    }
    
    // Fetch instructor documents
    const instructors = await Staff.find({ 
      _id: { $in: Array.from(instructorIds).map(id => new mongoose.Types.ObjectId(id)) }
    });
    
    // Cache the result
    if (this.cacheEnabled) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(instructors));
      } catch (e) {
        // Cache write failed, continue
      }
    }
    
    return instructors as IStaff[];
  }
  
  /**
   * Get courses for a program
   * Replaces deprecated Program.courses array
   */
  async getCourses(programId: string): Promise<ICourse[]> {
    const cacheKey = `program:${programId}:courses`;
    
    // Try cache first
    if (this.cacheEnabled) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (e) {
        // Cache miss or error, continue to query
      }
    }
    
    // Direct query using Course.program field
    const courses = await Course.find({ 
      program: new mongoose.Types.ObjectId(programId),
      isArchived: { $ne: true }
    });
    
    // Cache the result
    if (this.cacheEnabled) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(courses));
      } catch (e) {
        // Cache write failed, continue
      }
    }
    
    return courses as ICourse[];
  }
  
  /**
   * Invalidate all caches for a program
   * Should be called when:
   * - ProgramEnrollment created/updated/deleted
   * - Course created/updated (instructors changed)
   * - Course assigned/removed from program
   */
  async invalidateCache(programId: string): Promise<void> {
    if (!this.cacheEnabled) return;
    
    try {
      await Promise.all([
        redis.del(`program:${programId}:learners`),
        redis.del(`program:${programId}:instructors`),
        redis.del(`program:${programId}:courses`),
      ]);
    } catch (e) {
      // Cache invalidation failed, will expire naturally
    }
  }
  
  /**
   * Get learner count for a program (optimized)
   * DCV-026: status changed from 'active' to 'enrolled'
   */
  async getLearnerCount(programId: string): Promise<number> {
    return ProgramEnrollment.countDocuments({ 
      program: new mongoose.Types.ObjectId(programId), 
      status: 'enrolled' 
    });
  }
  
  /**
   * Get course count for a program (optimized)
   */
  async getCourseCount(programId: string): Promise<number> {
    return Course.countDocuments({ 
      program: new mongoose.Types.ObjectId(programId),
      isArchived: { $ne: true }
    });
  }
}

// Singleton instance
let instance: ProgramQueryService | null = null;

export function getProgramQueryService(): ProgramQueryService {
  if (!instance) {
    instance = new ProgramQueryService();
  }
  return instance;
}

export default ProgramQueryService;
