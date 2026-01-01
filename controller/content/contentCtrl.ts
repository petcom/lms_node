import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import CustomContent from '../../model/Content/CustomContent';
import Course from '../../model/Content/Course';
import RenderedCourse from '../../model/Content/RenderedCourse';
import LearnerProgress from '../../model/Content/LearnerProgress';
import ContentAttempt from '../../model/Content/ContentAttempt';
import ScormPackage from '../../model/Scorm/ScormPackage';
import ScormAttempt from '../../model/Scorm/ScormAttempt';
import Department from '../../model/Academic/Department';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';
import { IDepartment } from '../../types/models';

type DepartmentSummary = {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  level: number;
};

const MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

const getLevelNumber = (level: IDepartment['level']): number => {
  if (level === 'master') return 0;
  if (level === 'top') return 1;
  return 2;
};

const toDepartmentSummary = (dept: IDepartment): DepartmentSummary => ({
  id: dept._id.toString(),
  name: dept.name,
  code: dept.code ?? null,
  parentId: dept.parent ? dept.parent.toString() : null,
  level: getLevelNumber(dept.level),
});

const resolveDepartmentScope = async (
  req: Request,
  departmentId?: string | null
): Promise<{ departmentIds: string[] | null; departmentMap: Map<string, DepartmentSummary> }> => {
  const scope = req.departmentScope?.accessibleDepartmentIds;
  const isGlobalScope = !scope || scope === 'all';

  if (departmentId && !mongoose.isValidObjectId(departmentId)) {
    throw new ValidationError('departmentId must be a valid ObjectId');
  }

  if (departmentId && !isGlobalScope) {
    if (!scope?.includes(departmentId)) {
      throw new AuthorizationError('Access denied for this department');
    }
  }

  const departmentIds = departmentId
    ? [departmentId]
    : isGlobalScope
      ? null
      : (scope as string[]);

  const departments = await Department.find(
    departmentIds ? { _id: { $in: departmentIds } } : {}
  ).lean();

  const map = new Map<string, DepartmentSummary>();
  departments.forEach((dept) => {
    map.set(dept._id.toString(), toDepartmentSummary(dept));
  });

  return { departmentIds, departmentMap: map };
};

const renderCourseHtml = async (
  course: any,
  segments: Array<{
    type: 'custom' | 'scorm';
    segmentId: string;
    content: any;
  }>
): Promise<string> => {
  const styles: string[] = [];
  const bodySegments: string[] = [];

  segments.forEach((segment) => {
    if (segment.type === 'custom') {
      if (segment.content?.css) {
        styles.push(segment.content.css);
      }
      const html = segment.content?.html || `<pre>${JSON.stringify(segment.content?.payload || {}, null, 2)}</pre>`;
      bodySegments.push(
        `<section data-segment-id="${segment.segmentId}">${html}</section>`
      );
      return;
    }

    const iframeSrc = `/api/v1/content/scorm/player/launch/${segment.content?._id?.toString()}`;
    bodySegments.push(
      `<section data-segment-id="${segment.segmentId}"><iframe src="${iframeSrc}" width="100%" height="720" loading="lazy"></iframe></section>`
    );
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${course.title}</title>
    <style>${styles.join('\n')}</style>
  </head>
  <body>
    <main data-course-id="${course._id.toString()}">
      ${bodySegments.join('\n')}
    </main>
  </body>
</html>`;
};

const mapScormStatus = (status?: string): 'in_progress' | 'completed' | 'failed' => {
  if (!status) return 'in_progress';
  if (status === 'passed' || status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  return 'in_progress';
};

export const listContent = asyncHandler(async (req: Request, res: Response) => {
  const { type, customType, departmentId } = req.query as {
    type?: 'scorm' | 'custom';
    customType?: 'exam' | 'quiz' | 'practice' | 'other';
    departmentId?: string;
  };

  const { departmentIds, departmentMap } = await resolveDepartmentScope(req, departmentId);

  const departmentFilter =
    departmentIds === null
      ? {}
      : { department: { $in: departmentIds.map((id) => new mongoose.Types.ObjectId(id)) } };

  const [customItems, scormItems] = await Promise.all([
    type && type !== 'custom'
      ? Promise.resolve([])
      : CustomContent.find(customType ? { ...departmentFilter, customType } : departmentFilter)
          .lean(),
    type && type !== 'scorm'
      ? Promise.resolve([])
      : ScormPackage.find(departmentFilter).lean(),
  ]);

  const items = [
    ...customItems.map((item: any) => ({
      id: item._id.toString(),
      type: 'custom',
      customType: item.customType,
      title: item.title,
      department: item.department ? departmentMap.get(item.department.toString()) || null : null,
    })),
    ...scormItems.map((item: any) => ({
      id: item._id.toString(),
      type: 'scorm',
      customType: null,
      title: item.title,
      department: item.department ? departmentMap.get(item.department.toString()) || null : null,
    })),
  ];

  res.status(200).json({
    status: 'success',
    message: 'Content fetched successfully',
    items,
  });
});

export const getContent = asyncHandler(async (req: Request, res: Response) => {
  const contentId = req.params.id;
  const custom = await CustomContent.findById(contentId).lean();
  if (custom) {
    res.status(200).json({
      status: 'success',
      message: 'Content fetched successfully',
      data: {
        id: custom._id.toString(),
        type: 'custom',
        customType: custom.customType,
        title: custom.title,
        department: custom.department ? custom.department.toString() : null,
        payload: custom.payload,
        html: custom.html,
        css: custom.css,
      },
    });
    return;
  }

  const scorm = await ScormPackage.findById(contentId).lean();
  if (!scorm) {
    throw new NotFoundError('Content not found');
  }

  res.status(200).json({
    status: 'success',
    message: 'Content fetched successfully',
    data: {
      id: scorm._id.toString(),
      type: 'scorm',
      customType: null,
      title: scorm.title,
      department: scorm.department ? scorm.department.toString() : null,
    },
  });
});

export const createCustomContent = asyncHandler(async (req: Request, res: Response) => {
  const { customType, title, payload, html, css, departmentId } = req.body as {
    customType: 'exam' | 'quiz' | 'practice' | 'other';
    title: string;
    payload?: any;
    html?: string;
    css?: string;
    departmentId?: string;
  };

  const scope = req.departmentScope?.accessibleDepartmentIds;
  const departmentToUse = departmentId || (req.userAuth as any)?.department?.toString();

  if (departmentToUse && !mongoose.isValidObjectId(departmentToUse)) {
    throw new ValidationError('Invalid department id');
  }
  if (departmentToUse && scope && scope !== 'all' && !scope.includes(departmentToUse)) {
    throw new AuthorizationError('Access denied for this department');
  }

  const content = await CustomContent.create({
    customType,
    title,
    payload,
    html,
    css,
    department: departmentToUse ? new mongoose.Types.ObjectId(departmentToUse) : undefined,
    createdBy: (req.userAuth as any)?._id,
  });

  res.status(201).json({
    status: 'success',
    message: 'Custom content created successfully',
    data: content,
  });
});

export const updateCustomContent = asyncHandler(async (req: Request, res: Response) => {
  const { customType, title, payload, html, css, departmentId } = req.body as {
    customType?: 'exam' | 'quiz' | 'practice' | 'other';
    title?: string;
    payload?: any;
    html?: string;
    css?: string;
    departmentId?: string | null;
  };

  const content = await CustomContent.findById(req.params.id);
  if (!content) {
    throw new NotFoundError('Custom content not found');
  }

  if (departmentId !== undefined) {
    if (departmentId && !mongoose.isValidObjectId(departmentId)) {
      throw new ValidationError('Invalid department id');
    }
    const scope = req.departmentScope?.accessibleDepartmentIds;
    if (departmentId && scope && scope !== 'all' && !scope.includes(departmentId)) {
      throw new AuthorizationError('Access denied for this department');
    }
    content.department = departmentId ? new mongoose.Types.ObjectId(departmentId) : undefined;
  }

  if (customType) content.customType = customType;
  if (title) content.title = title;
  if (payload !== undefined) content.payload = payload;
  if (html !== undefined) content.html = html;
  if (css !== undefined) content.css = css;

  await content.save();

  res.status(200).json({
    status: 'success',
    message: 'Custom content updated successfully',
    data: content,
  });
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.id).lean();
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  res.status(200).json({
    status: 'success',
    message: 'Course fetched successfully',
    data: course,
  });
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const { title, departmentId, segments } = req.body as {
    title?: string;
    departmentId?: string | null;
    segments?: Array<{ segmentId?: string; type: 'scorm' | 'custom'; contentId: string }>;
  };

  const updates: any = {};
  if (title) updates.title = title;

  if (departmentId !== undefined) {
    if (departmentId && !mongoose.isValidObjectId(departmentId)) {
      throw new ValidationError('Invalid department id');
    }
    updates.department = departmentId ? new mongoose.Types.ObjectId(departmentId) : undefined;
  }

  if (segments) {
    updates.segments = segments.map((segment) => ({
      segmentId: segment.segmentId || new mongoose.Types.ObjectId().toString(),
      type: segment.type,
      contentId: new mongoose.Types.ObjectId(segment.contentId),
    }));
  }

  const course = await Course.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Course updated successfully',
    data: course,
  });
});

export const renderCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.id).lean();
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const existing = await RenderedCourse.findOne({ courseId: course._id }).lean();
  const courseVersion = course.updatedAt || new Date();
  if (existing && new Date(existing.contentVersion).getTime() === new Date(courseVersion).getTime()) {
    res.status(200).json({
      status: 'success',
      message: 'Course rendered successfully',
      data: {
        courseId: course._id.toString(),
        contentVersion: existing.contentVersion,
        html: existing.html,
      },
    });
    return;
  }

  const segmentsWithContent = await Promise.all(
    course.segments.map(async (segment: any) => {
      if (segment.type === 'custom') {
        const content = await CustomContent.findById(segment.contentId).lean();
        if (!content) {
          throw new NotFoundError('Custom content not found');
        }
        return { ...segment, content };
      }
      const content = await ScormPackage.findById(segment.contentId).lean();
      if (!content) {
        throw new NotFoundError('SCORM package not found');
      }
      return { ...segment, content };
    })
  );

  const html = await renderCourseHtml(course, segmentsWithContent as any);

  const saved = await RenderedCourse.findOneAndUpdate(
    { courseId: course._id },
    { contentVersion: courseVersion, html },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Course rendered successfully',
    data: {
      courseId: course._id.toString(),
      contentVersion: saved?.contentVersion || courseVersion,
      html,
    },
  });
});

export const forceRenderCourse = asyncHandler(async (req: Request, res: Response) => {
  const course = await Course.findById(req.params.id).lean();
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const segmentsWithContent = await Promise.all(
    course.segments.map(async (segment: any) => {
      if (segment.type === 'custom') {
        const content = await CustomContent.findById(segment.contentId).lean();
        if (!content) {
          throw new NotFoundError('Custom content not found');
        }
        return { ...segment, content };
      }
      const content = await ScormPackage.findById(segment.contentId).lean();
      if (!content) {
        throw new NotFoundError('SCORM package not found');
      }
      return { ...segment, content };
    })
  );

  const html = await renderCourseHtml(course, segmentsWithContent as any);
  const courseVersion = course.updatedAt || new Date();

  await RenderedCourse.findOneAndUpdate(
    { courseId: course._id },
    { contentVersion: courseVersion, html },
    { new: true, upsert: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'Course rendered successfully',
    data: {
      courseId: course._id.toString(),
      contentVersion: courseVersion,
      html,
    },
  });
});

export const recordCustomProgress = asyncHandler(async (req: Request, res: Response) => {
  const custom = await CustomContent.findById(req.params.id).lean();
  if (!custom) {
    throw new NotFoundError('Custom content not found');
  }

  const { courseId, segmentId, eventType, payload } = req.body as {
    courseId: string;
    segmentId: string;
    eventType: 'answer' | 'quiz_complete' | 'section_complete';
    payload?: { score?: number; maxScore?: number; durationSec?: number };
  };

  const learnerId = (req.userAuth as any)?._id;
  if (!learnerId) {
    throw new ValidationError('Missing learner id');
  }

  const courseObjectId = new mongoose.Types.ObjectId(courseId);

  const existing = await LearnerProgress.findOne({
    learnerId,
    courseId: courseObjectId,
    contentId: custom._id,
    segmentId,
  });

  const status =
    eventType === 'quiz_complete' || eventType === 'section_complete'
      ? 'completed'
      : 'in_progress';
  const progressPercent = status === 'completed' ? 100 : existing?.progressPercent || 0;

  const score = payload?.score ?? existing?.score ?? 0;
  const maxScore = payload?.maxScore ?? existing?.maxScore ?? 100;
  const timeSpentSec = (existing?.timeSpentSec || 0) + (payload?.durationSec || 0);

  const attemptCount = (existing?.attemptCount || 0) + 1;

  await LearnerProgress.findOneAndUpdate(
    { learnerId, courseId: courseObjectId, contentId: custom._id, segmentId },
    {
      learnerId,
      courseId: courseObjectId,
      contentId: custom._id,
      segmentId,
      contentType: 'custom',
      customType: custom.customType,
      status,
      progressPercent,
      score,
      maxScore,
      passed: maxScore > 0 ? score >= maxScore * 0.6 : undefined,
      attemptCount,
      timeSpentSec,
      lastActivityAt: new Date(),
      payload,
    },
    { new: true, upsert: true }
  );

  await ContentAttempt.create({
    learnerId,
    courseId: courseObjectId,
    contentId: custom._id,
    segmentId,
    contentType: 'custom',
    customType: custom.customType,
    attemptNumber: attemptCount,
    startedAt: new Date(),
    submittedAt: new Date(),
    status: status === 'completed' ? 'completed' : 'in_progress',
    score,
    maxScore,
    passed: maxScore > 0 ? score >= maxScore * 0.6 : undefined,
    timeSpentSec: payload?.durationSec || 0,
    payload,
  });

  res.status(200).json({
    status: 'success',
    message: 'Progress recorded successfully',
  });
});

export const listAttempts = asyncHandler(async (req: Request, res: Response) => {
  const contentId = req.params.id;
  if (!mongoose.isValidObjectId(contentId)) {
    throw new ValidationError('Invalid content id');
  }

  const custom = await CustomContent.findById(contentId).lean();
  if (custom) {
    const attempts = await ContentAttempt.find({ contentId }).lean();
    res.status(200).json({
      status: 'success',
      message: 'Attempts fetched successfully',
      items: attempts,
    });
    return;
  }

  const scorm = await ScormPackage.findById(contentId).lean();
  if (!scorm) {
    throw new NotFoundError('Content not found');
  }

  const scormAttempts = await ScormAttempt.find({ package: scorm._id }).lean();
  const items = scormAttempts.map((attempt: any) => ({
    id: attempt._id.toString(),
    learnerId: attempt.learner?.toString(),
    courseId: null,
    contentId: scorm._id.toString(),
    segmentId: attempt.attemptId,
    contentType: 'scorm',
    customType: null,
    attemptNumber: attempt.attemptNumber,
    startedAt: attempt.startedAt,
    submittedAt: attempt.completedAt || attempt.lastAccessedAt,
    status: mapScormStatus(attempt.status),
    score: attempt.cmi?.score?.raw ?? 0,
    maxScore: attempt.cmi?.score?.max ?? 100,
    passed: attempt.status === 'passed',
    timeSpentSec: 0,
    payload: attempt.cmi || {},
  }));

  res.status(200).json({
    status: 'success',
    message: 'Attempts fetched successfully',
    items,
  });
});

export const listReports = asyncHandler(async (req: Request, res: Response) => {
  const { courseId, learnerId, contentType, customType } = req.query as {
    courseId?: string;
    learnerId?: string;
    contentType?: 'scorm' | 'custom';
    customType?: 'exam' | 'quiz' | 'practice' | 'other';
  };

  const filter: any = {};
  if (courseId) filter.courseId = new mongoose.Types.ObjectId(courseId);
  if (learnerId) filter.learnerId = new mongoose.Types.ObjectId(learnerId);
  if (contentType) filter.contentType = contentType;
  if (customType) filter.customType = customType;

  const progressItems = await LearnerProgress.find(filter).lean();

  let scormAttempts: any[] = [];
  if (!contentType || contentType === 'scorm') {
    const scormFilter: any = {};
    if (learnerId) {
      scormFilter.learner = new mongoose.Types.ObjectId(learnerId);
    }
    if (courseId) {
      const course = await Course.findById(courseId).lean();
      if (course) {
        const scormIds = course.segments
          .filter((segment: any) => segment.type === 'scorm')
          .map((segment: any) => segment.contentId);
        scormFilter.package = { $in: scormIds };
      }
    }
    scormAttempts = await ScormAttempt.find(scormFilter).lean();
  }

  const customIds = progressItems
    .filter((item) => item.contentType === 'custom')
    .map((item) => item.contentId);
  const scormIds = [
    ...progressItems.filter((item) => item.contentType === 'scorm').map((item) => item.contentId),
    ...scormAttempts.map((attempt) => attempt.package),
  ];

  const [customContent, scormContent] = await Promise.all([
    CustomContent.find({ _id: { $in: customIds } }).select('title').lean(),
    ScormPackage.find({ _id: { $in: scormIds } }).select('title').lean(),
  ]);

  const titleMap = new Map<string, string>();
  customContent.forEach((item) => titleMap.set(item._id.toString(), item.title));
  scormContent.forEach((item) => titleMap.set(item._id.toString(), item.title));

  const items = [
    ...progressItems.map((item) => ({
      contentId: item.contentId.toString(),
      contentType: item.contentType,
      customType: item.customType || null,
      title: titleMap.get(item.contentId.toString()) || 'Unknown',
      status: item.status,
      progressPercent: item.progressPercent,
      score: item.score,
      maxScore: item.maxScore,
      passed: item.passed,
      lastActivityAt: item.lastActivityAt,
    })),
    ...scormAttempts.map((attempt) => ({
      contentId: attempt.package.toString(),
      contentType: 'scorm',
      customType: null,
      title: titleMap.get(attempt.package.toString()) || 'Unknown',
      status: mapScormStatus(attempt.status),
      progressPercent: ['passed', 'completed'].includes(attempt.status) ? 100 : 0,
      score: attempt.cmi?.score?.raw ?? 0,
      maxScore: attempt.cmi?.score?.max ?? 100,
      passed: attempt.status === 'passed',
      lastActivityAt: attempt.lastAccessedAt,
    })),
  ];

  res.status(200).json({
    status: 'success',
    message: 'Content reports fetched successfully',
    items,
  });
});
