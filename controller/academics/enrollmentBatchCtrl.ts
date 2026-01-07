/**
 * Batch Enrollment Controller
 * Handles batch operations for program, class, and course enrollments
 * V2 API - EVIP Phase 5 implementation
 */

import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Program from '../../model/Academic/Program';
import ProgramEnrollment from '../../model/Academic/ProgramEnrollment';
import ClassModel from '../../model/Academic/Class';
import ClassEnrollment from '../../model/Academic/ClassEnrollment';
import Course from '../../model/Content/Course';
import CourseEnrollmentCurrent from '../../model/Academic/CourseEnrollmentCurrent';
import Learner from '../../model/Academic/Learner';

interface BatchEnrollmentItem {
  learner: string;
  program?: string;
  classId?: string;
  course?: string;
  status?: string;
  enrolledAt?: string;
  startedAt?: string;
}

interface BatchResult<T> {
  created: T[];
  failed: Array<{
    index: number;
    item: BatchEnrollmentItem;
    reason: string;
  }>;
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

/**
 * Batch create program enrollments
 * POST /api/v1/program-enrollments/batch
 * Max batch size: 100
 */
export const batchCreateProgramEnrollments = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, { enrollments: BatchEnrollmentItem[] }>,
    res: Response
  ): Promise<void> => {
    const { enrollments } = req.body;
    const scope = req.departmentScope?.accessibleDepartmentIds;

    const result: BatchResult<any> = {
      created: [],
      failed: [],
      summary: { total: enrollments.length, succeeded: 0, failed: 0 },
    };

    // Pre-fetch all unique programs for scope validation
    const programIds = [...new Set(enrollments.map((e) => e.program))];
    const programs = await Program.find({ _id: { $in: programIds } })
      .select('_id department')
      .lean();
    const programMap = new Map(programs.map((p) => [p._id.toString(), p]));

    // Pre-fetch existing enrollments to check for duplicates
    const existingEnrollments = await ProgramEnrollment.find({
      $or: enrollments.map((e) => ({
        learner: new mongoose.Types.ObjectId(e.learner),
        program: new mongoose.Types.ObjectId(e.program!),
      })),
    })
      .select('learner program')
      .lean();
    const existingSet = new Set(
      existingEnrollments.map((e) => `${e.learner}-${e.program}`)
    );

    // Pre-fetch all learners to validate they exist
    const learnerIds = [...new Set(enrollments.map((e) => e.learner))];
    const learners = await Learner.find({ _id: { $in: learnerIds } })
      .select('_id')
      .lean();
    const learnerSet = new Set(learners.map((l) => l._id.toString()));

    // Process each enrollment
    const toCreate: any[] = [];

    for (let i = 0; i < enrollments.length; i++) {
      const item = enrollments[i];

      // Validate program exists
      const program = programMap.get(item.program!);
      if (!program) {
        result.failed.push({ index: i, item, reason: 'Program not found' });
        continue;
      }

      // Validate scope access
      const departmentId = program.department?.toString();
      if (scope && scope !== 'all' && departmentId && !scope.includes(departmentId)) {
        result.failed.push({ index: i, item, reason: 'Access denied for this department' });
        continue;
      }

      // Validate learner exists
      if (!learnerSet.has(item.learner)) {
        result.failed.push({ index: i, item, reason: 'Learner not found' });
        continue;
      }

      // Check for duplicate
      const key = `${item.learner}-${item.program}`;
      if (existingSet.has(key)) {
        result.failed.push({ index: i, item, reason: 'Learner already enrolled in program' });
        continue;
      }

      // Add to existing set to prevent duplicates within batch
      existingSet.add(key);

      toCreate.push({
        learner: new mongoose.Types.ObjectId(item.learner),
        program: new mongoose.Types.ObjectId(item.program!),
        status: item.status || 'enrolled',
        enrolledAt: item.enrolledAt ? new Date(item.enrolledAt) : new Date(),
      });
    }

    // Bulk insert valid enrollments
    if (toCreate.length > 0) {
      const created = await ProgramEnrollment.insertMany(toCreate, { ordered: false });
      result.created = created;
      result.summary.succeeded = created.length;
    }

    result.summary.failed = result.failed.length;

    res.status(207).json({
      status: 'success',
      message: `Batch program enrollment: ${result.summary.succeeded} created, ${result.summary.failed} failed`,
      data: result,
    });
  }
);

/**
 * Batch create class enrollments
 * POST /api/v1/class-enrollments/batch
 * Max batch size: 100
 */
export const batchCreateClassEnrollments = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, { enrollments: BatchEnrollmentItem[] }>,
    res: Response
  ): Promise<void> => {
    const { enrollments } = req.body;
    const scope = req.departmentScope?.accessibleDepartmentIds;

    const result: BatchResult<any> = {
      created: [],
      failed: [],
      summary: { total: enrollments.length, succeeded: 0, failed: 0 },
    };

    // Pre-fetch all unique classes for scope validation
    const classIds = [...new Set(enrollments.map((e) => e.classId))].filter(Boolean);
    const classes = await ClassModel.find({ _id: { $in: classIds } })
      .select('_id department program programLevel')
      .lean();
    const classMap = new Map(classes.map((c) => [c._id.toString(), c]));

    // Pre-fetch existing enrollments to check for duplicates
    const existingEnrollments = await ClassEnrollment.find({
      $or: enrollments.map((e) => ({
        learner: new mongoose.Types.ObjectId(e.learner),
        class: new mongoose.Types.ObjectId(e.classId!),
      })),
    })
      .select('learner class')
      .lean();
    const existingSet = new Set(
      existingEnrollments.map((e) => `${e.learner}-${e.class}`)
    );

    // Pre-fetch all learners to validate they exist
    const learnerIds = [...new Set(enrollments.map((e) => e.learner))];
    const learners = await Learner.find({ _id: { $in: learnerIds } })
      .select('_id')
      .lean();
    const learnerSet = new Set(learners.map((l) => l._id.toString()));

    // Process each enrollment
    const toCreate: any[] = [];

    for (let i = 0; i < enrollments.length; i++) {
      const item = enrollments[i];

      // Validate class exists
      const classDoc = classMap.get(item.classId!);
      if (!classDoc) {
        result.failed.push({ index: i, item, reason: 'Class not found' });
        continue;
      }

      // Validate scope access
      const departmentId = classDoc.department?.toString();
      if (scope && scope !== 'all' && departmentId && !scope.includes(departmentId)) {
        result.failed.push({ index: i, item, reason: 'Access denied for this department' });
        continue;
      }

      // Validate learner exists
      if (!learnerSet.has(item.learner)) {
        result.failed.push({ index: i, item, reason: 'Learner not found' });
        continue;
      }

      // Check for duplicate
      const key = `${item.learner}-${item.classId}`;
      if (existingSet.has(key)) {
        result.failed.push({ index: i, item, reason: 'Learner already enrolled in class' });
        continue;
      }

      // Add to existing set to prevent duplicates within batch
      existingSet.add(key);

      toCreate.push({
        learner: new mongoose.Types.ObjectId(item.learner),
        class: new mongoose.Types.ObjectId(item.classId!),
        program: classDoc.program,
        programLevel: classDoc.programLevel,
        enrolledAt: item.enrolledAt ? new Date(item.enrolledAt) : new Date(),
      });
    }

    // Bulk insert valid enrollments
    if (toCreate.length > 0) {
      const created = await ClassEnrollment.insertMany(toCreate, { ordered: false });
      result.created = created;
      result.summary.succeeded = created.length;
    }

    result.summary.failed = result.failed.length;

    res.status(207).json({
      status: 'success',
      message: `Batch class enrollment: ${result.summary.succeeded} created, ${result.summary.failed} failed`,
      data: result,
    });
  }
);

/**
 * Batch create course enrollments
 * POST /api/v1/course-enrollments/batch
 * Max batch size: 100
 */
export const batchCreateCourseEnrollments = AsyncHandler(
  async (
    req: Request<Record<string, never>, any, { enrollments: BatchEnrollmentItem[] }>,
    res: Response
  ): Promise<void> => {
    const { enrollments } = req.body;
    const scope = req.departmentScope?.accessibleDepartmentIds;

    const result: BatchResult<any> = {
      created: [],
      failed: [],
      summary: { total: enrollments.length, succeeded: 0, failed: 0 },
    };

    // Pre-fetch all unique courses for scope validation and program lookup
    const courseIds = [...new Set(enrollments.map((e) => e.course))].filter(Boolean);
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select('_id program')
      .lean();
    const courseMap = new Map(courses.map((c) => [c._id.toString(), c]));

    // Pre-fetch programs to get department for scope validation
    const programIdsForCourses = [...new Set(courses.map((c) => c.program))];
    const programsForCourses = await Program.find({ _id: { $in: programIdsForCourses } })
      .select('_id department')
      .lean();
    const programDeptMap = new Map(programsForCourses.map((p) => [p._id.toString(), p.department?.toString()]));

    // Pre-fetch existing enrollments to check for duplicates
    const existingEnrollments = await CourseEnrollmentCurrent.find({
      $or: enrollments.map((e) => ({
        learner: new mongoose.Types.ObjectId(e.learner),
        course: new mongoose.Types.ObjectId(e.course!),
      })),
    })
      .select('learner course')
      .lean();
    const existingSet = new Set(
      existingEnrollments.map((e) => `${e.learner}-${e.course}`)
    );

    // Pre-fetch all learners to validate they exist
    const learnerIds = [...new Set(enrollments.map((e) => e.learner))];
    const learners = await Learner.find({ _id: { $in: learnerIds } })
      .select('_id')
      .lean();
    const learnerSet = new Set(learners.map((l) => l._id.toString()));

    // Pre-fetch program enrollments for all learner/program combinations
    const learnerProgramPairs: Array<{ learner: mongoose.Types.ObjectId; program: mongoose.Types.ObjectId }> = [];
    for (const e of enrollments) {
      const course = courseMap.get(e.course!);
      if (course && course.program) {
        learnerProgramPairs.push({
          learner: new mongoose.Types.ObjectId(e.learner),
          program: course.program,
        });
      }
    }

    const programEnrollments = await ProgramEnrollment.find({
      $or: learnerProgramPairs.length > 0 ? learnerProgramPairs : [{ _id: null }],
    })
      .select('_id learner program')
      .lean();
    const peMap = new Map(
      programEnrollments.map((pe) => [`${pe.learner}-${pe.program}`, pe._id])
    );

    // Process each enrollment
    const toCreate: any[] = [];

    for (let i = 0; i < enrollments.length; i++) {
      const item = enrollments[i];

      // Validate course exists
      const course = courseMap.get(item.course!);
      if (!course) {
        result.failed.push({ index: i, item, reason: 'Course not found' });
        continue;
      }

      // Validate scope access (department comes from Program)
      const departmentId = programDeptMap.get(course.program?.toString() || '');
      if (scope && scope !== 'all' && departmentId && !scope.includes(departmentId)) {
        result.failed.push({ index: i, item, reason: 'Access denied for this department' });
        continue;
      }

      // Validate learner exists
      if (!learnerSet.has(item.learner)) {
        result.failed.push({ index: i, item, reason: 'Learner not found' });
        continue;
      }

      // Check for duplicate
      const key = `${item.learner}-${item.course}`;
      if (existingSet.has(key)) {
        result.failed.push({ index: i, item, reason: 'Learner already enrolled in course' });
        continue;
      }

      // Get program enrollment ID
      const peKey = `${item.learner}-${course.program}`;
      const programEnrollmentId = peMap.get(peKey);
      if (!programEnrollmentId) {
        result.failed.push({ index: i, item, reason: 'Learner must be enrolled in program first' });
        continue;
      }

      // Add to existing set to prevent duplicates within batch
      existingSet.add(key);

      toCreate.push({
        learner: new mongoose.Types.ObjectId(item.learner),
        course: new mongoose.Types.ObjectId(item.course!),
        programEnrollment: programEnrollmentId,
        classId: item.classId ? new mongoose.Types.ObjectId(item.classId) : undefined,
        status: 'active',
        progress: { overall: 0 },
        startedAt: item.startedAt ? new Date(item.startedAt) : new Date(),
      });
    }

    // Bulk insert valid enrollments
    if (toCreate.length > 0) {
      const created = await CourseEnrollmentCurrent.insertMany(toCreate, { ordered: false });
      result.created = created;
      result.summary.succeeded = created.length;
    }

    result.summary.failed = result.failed.length;

    res.status(207).json({
      status: 'success',
      message: `Batch course enrollment: ${result.summary.succeeded} created, ${result.summary.failed} failed`,
      data: result,
    });
  }
);
