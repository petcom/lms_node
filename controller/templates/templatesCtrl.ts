import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import DepartmentMasterCSS from '../../model/Content/DepartmentMasterCSS';
import MasterTemplate from '../../model/Content/MasterTemplate';
import Department from '../../model/Academic/Department';
import { AuthorizationError, NotFoundError, ValidationError } from '../../utils/errors';
import { PASSING_STYLE_SCORE, scoreCss } from '../../utils/templates/cssRating';

const MASTER_DEPARTMENT_ID = process.env.MASTER_DEPARTMENT_ID || '000000000000000000000d00';

const isSystemAdmin = (req: Request): boolean =>
  req.departmentScope?.accessibleDepartmentIds === 'all';

const ensureDepartmentScope = (
  req: Request,
  departmentId: string | null,
  message: string
): void => {
  const scope = req.departmentScope?.accessibleDepartmentIds;
  if (!departmentId) return;
  if (scope && scope !== 'all' && !scope.includes(departmentId)) {
    throw new AuthorizationError(message);
  }
};

const normalizeRegions = (
  type: 'scorm' | 'custom' | 'hybrid',
  regions: Array<{ id: string; kind: 'scorm' | 'custom'; title: string }>
): void => {
  if (!Array.isArray(regions) || regions.length === 0) {
    throw new ValidationError('layout.regions is required');
  }
  if (type === 'scorm') {
    if (regions.some((r) => r.kind !== 'scorm')) {
      throw new ValidationError('SCORM templates can only include scorm regions');
    }
  }
  if (type === 'custom') {
    if (regions.some((r) => r.kind !== 'custom')) {
      throw new ValidationError('Custom templates can only include custom regions');
    }
  }
  if (type === 'hybrid') {
    if (!regions.some((r) => r.kind === 'custom')) {
      throw new ValidationError('Hybrid templates require at least one custom region');
    }
  }
};

const resolveMasterCss = async (
  departmentId: string
): Promise<{ css: string; version: number }> => {
  const record = await DepartmentMasterCSS.findOne({
    departmentId: new mongoose.Types.ObjectId(departmentId),
  }).lean();
  if (!record) {
    return { css: '', version: 0 };
  }
  return { css: record.css, version: record.version };
};

const formatScore = (
  score: {
    value: number;
    comparedToVersion: number;
    diffs?: Array<{ selector: string; property: string; expected?: string; actual?: string }>;
  } | null,
  passingStyleScore: number
) => {
  if (!score) return null;
  return {
    value: score.value,
    comparedToVersion: score.comparedToVersion,
    diffs: score.diffs,
    passingStyleScore,
  };
};

const resolvePassingStyleScore = async (departmentId?: string | null): Promise<number> => {
  const targetId = departmentId || MASTER_DEPARTMENT_ID;
  if (!mongoose.isValidObjectId(targetId)) {
    return PASSING_STYLE_SCORE;
  }

  const department = await Department.findById(targetId)
    .select('passingStyleScore parent ancestors')
    .lean();
  if (!department) {
    return PASSING_STYLE_SCORE;
  }

  if (typeof department.passingStyleScore === 'number') {
    return department.passingStyleScore;
  }

  const ancestorIds = [department.parent, ...(department.ancestors || [])]
    .filter(Boolean)
    .map((id) => id.toString());

  if (ancestorIds.length > 0) {
    const ancestors = await Department.find({ _id: { $in: ancestorIds } })
      .select('passingStyleScore')
      .lean();
    const ancestorMap = new Map(ancestors.map((a) => [a._id.toString(), a]));
    for (const ancestorId of ancestorIds) {
      const ancestor = ancestorMap.get(ancestorId);
      if (ancestor && typeof ancestor.passingStyleScore === 'number') {
        return ancestor.passingStyleScore;
      }
    }
  }

  if (targetId !== MASTER_DEPARTMENT_ID) {
    const master = await Department.findById(MASTER_DEPARTMENT_ID)
      .select('passingStyleScore')
      .lean();
    if (typeof master?.passingStyleScore === 'number') {
      return master.passingStyleScore;
    }
  }

  return PASSING_STYLE_SCORE;
};

export const getMasterCss = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = req.params.id;
  if (!mongoose.isValidObjectId(departmentId)) {
    throw new ValidationError('Invalid department id');
  }

  ensureDepartmentScope(req, departmentId, 'Access denied for this department');

  const record = await DepartmentMasterCSS.findOne({
    departmentId: new mongoose.Types.ObjectId(departmentId),
  }).lean();

  if (!record) {
    res.status(200).json({
      status: 'success',
      data: {
        departmentId,
        css: '',
        version: 0,
        updatedBy: null,
        updatedAt: null,
      },
    });
    return;
  }

  res.status(200).json({
    status: 'success',
    data: {
      departmentId: record.departmentId.toString(),
      css: record.css,
      version: record.version,
      updatedBy: record.updatedBy?.toString?.() || null,
      updatedAt: record.updatedAt,
    },
  });
});

export const updateMasterCss = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = req.params.id;
  const { css } = req.body as { css: string };
  if (!mongoose.isValidObjectId(departmentId)) {
    throw new ValidationError('Invalid department id');
  }

  if (!isSystemAdmin(req)) {
    throw new AuthorizationError('Only system admins can update master CSS');
  }

  const department = await Department.findById(departmentId).lean();
  if (!department) {
    throw new NotFoundError('Department not found');
  }

  const existing = await DepartmentMasterCSS.findOne({
    departmentId: new mongoose.Types.ObjectId(departmentId),
  });

  if (!existing) {
    const created = await DepartmentMasterCSS.create({
      departmentId: new mongoose.Types.ObjectId(departmentId),
      css,
      version: 1,
      updatedBy: req.userAuth?._id,
    });
    res.status(200).json({
      status: 'success',
      data: {
        departmentId: created.departmentId.toString(),
        css: created.css,
        version: created.version,
        updatedBy: created.updatedBy?.toString?.() || null,
        updatedAt: created.updatedAt,
      },
    });
    return;
  }

  existing.css = css;
  existing.version += 1;
  existing.updatedBy = req.userAuth?._id;
  await existing.save();

  res.status(200).json({
    status: 'success',
    data: {
      departmentId: existing.departmentId.toString(),
      css: existing.css,
      version: existing.version,
      updatedBy: existing.updatedBy?.toString?.() || null,
      updatedAt: existing.updatedAt,
    },
  });
});

export const scoreTemplateCss = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, css } = req.body as { departmentId: string; css: string };
  if (!mongoose.isValidObjectId(departmentId)) {
    throw new ValidationError('Invalid department id');
  }

  ensureDepartmentScope(req, departmentId, 'Access denied for this department');

  const master = await resolveMasterCss(departmentId);
  const score = scoreCss(master.css, css, master.version);
  const passingStyleScore = await resolvePassingStyleScore(departmentId);

  res.status(200).json({
    status: 'success',
    score: {
      value: score.value,
      comparedToVersion: score.comparedToVersion,
      diffs: score.diffs.map(({ selector, property, expected, actual }) => ({
        selector,
        property,
        expected,
        actual,
      })),
      passingStyleScore,
    },
  });
});

export const listTemplates = asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, type, status, isGlobal } = req.query as {
    departmentId?: string;
    type?: 'scorm' | 'custom' | 'hybrid';
    status?: 'draft' | 'published' | 'archived';
    isGlobal?: string;
  };

  if (departmentId && !mongoose.isValidObjectId(departmentId)) {
    throw new ValidationError('Invalid department id');
  }

  if (departmentId) {
    ensureDepartmentScope(req, departmentId, 'Access denied for this department');
  }

  const filter: Record<string, any> = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (isGlobal !== undefined) filter.isGlobal = isGlobal === 'true';

  if (departmentId) {
    filter.departmentId = new mongoose.Types.ObjectId(departmentId);
  } else if (!isSystemAdmin(req)) {
    const scope = req.departmentScope?.accessibleDepartmentIds as string[] | undefined;
    filter.$or = [
      { isGlobal: true },
      {
        departmentId: {
          $in: (scope || []).map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
    ];
  }

  const templates = await MasterTemplate.find(filter).sort({ updatedAt: -1 }).lean();
  const passingStyleScoreCache = new Map<string, number>();

  const items = [];
  for (const template of templates) {
    const deptId = template.departmentId ? template.departmentId.toString() : null;
    const cacheKey = deptId || MASTER_DEPARTMENT_ID;
    let passingStyleScore = passingStyleScoreCache.get(cacheKey);
    if (passingStyleScore === undefined) {
      passingStyleScore = await resolvePassingStyleScore(deptId);
      passingStyleScoreCache.set(cacheKey, passingStyleScore);
    }
    items.push({
      id: template._id.toString(),
      name: template.name,
      type: template.type,
      status: template.status,
      departmentId: template.departmentId ? template.departmentId.toString() : null,
      isGlobal: template.isGlobal,
      score: template.score
        ? {
            value: template.score.value,
            comparedToVersion: template.score.comparedToVersion,
            passingStyleScore,
          }
        : null,
      overrideStatus: template.overrideStatus,
      updatedAt: template.updatedAt,
    });
  }

  res.status(200).json({ status: 'success', items });
});

export const getTemplate = asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params.id;
  if (!mongoose.isValidObjectId(templateId)) {
    throw new ValidationError('Invalid template id');
  }

  const template = await MasterTemplate.findById(templateId).lean();
  if (!template) {
    throw new NotFoundError('Template not found');
  }

  if (!template.isGlobal && template.departmentId) {
    ensureDepartmentScope(req, template.departmentId.toString(), 'Access denied for this template');
  }
  if (template.isGlobal && !isSystemAdmin(req)) {
    throw new AuthorizationError('Only system admins can update global templates');
  }

  const passingStyleScore = await resolvePassingStyleScore(
    template.departmentId ? template.departmentId.toString() : null
  );

  res.status(200).json({
    status: 'success',
    data: {
      id: template._id.toString(),
      name: template.name,
      description: template.description,
      type: template.type,
      status: template.status,
      departmentId: template.departmentId ? template.departmentId.toString() : null,
      isGlobal: template.isGlobal,
      css: template.css,
      layout: template.layout,
      score: formatScore(template.score as any, passingStyleScore),
      overrideStatus: template.overrideStatus,
      createdBy: template.createdBy.toString(),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    },
  });
});

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, type, departmentId, isGlobal, css, layout } = req.body as {
    name: string;
    description?: string;
    type: 'scorm' | 'custom' | 'hybrid';
    departmentId?: string;
    isGlobal?: boolean;
    css?: string;
    layout: { grid?: string; regions: Array<{ id: string; kind: 'scorm' | 'custom'; title: string }> };
  };

  normalizeRegions(type, layout?.regions || []);

  const globalFlag = Boolean(isGlobal);
  if (globalFlag && !isSystemAdmin(req)) {
    throw new AuthorizationError('Only system admins can create global templates');
  }

  let resolvedDepartmentId = departmentId || req.departmentScope?.userDepartmentId || null;
  if (!globalFlag && !resolvedDepartmentId) {
    throw new ValidationError('departmentId is required for non-global templates');
  }

  if (resolvedDepartmentId && !mongoose.isValidObjectId(resolvedDepartmentId)) {
    throw new ValidationError('Invalid department id');
  }

  if (resolvedDepartmentId) {
    ensureDepartmentScope(req, resolvedDepartmentId, 'Access denied for this department');
  }

  const passingStyleScore = await resolvePassingStyleScore(resolvedDepartmentId);
  const master = resolvedDepartmentId ? await resolveMasterCss(resolvedDepartmentId) : null;
  const score =
    master && css !== undefined
      ? scoreCss(master.css, css || '', master.version)
      : {
          value: 0,
          diffs: [],
          comparedToVersion: master?.version || 0,
          passingStyleScore,
        };

  const overrideStatus =
    css && css.length > 0
      ? isSystemAdmin(req)
        ? 'approved'
        : 'pending'
      : 'inherited';

  const template = await MasterTemplate.create({
    name,
    description,
    type,
    departmentId: resolvedDepartmentId ? new mongoose.Types.ObjectId(resolvedDepartmentId) : undefined,
    isGlobal: globalFlag,
    css: css || '',
    layout,
    score: score
      ? { value: score.value, comparedToVersion: score.comparedToVersion, diffs: score.diffs }
      : undefined,
    overrideStatus,
    status: 'draft',
    createdBy: req.userAuth?._id,
  });

  res.status(201).json({
    status: 'success',
    data: {
      id: template._id.toString(),
      name: template.name,
      description: template.description,
      type: template.type,
      status: template.status,
      departmentId: template.departmentId ? template.departmentId.toString() : null,
      isGlobal: template.isGlobal,
      css: template.css,
      layout: template.layout,
      score: formatScore(template.score as any, passingStyleScore),
      overrideStatus: template.overrideStatus,
      createdBy: template.createdBy.toString(),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    },
  });
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params.id;
  if (!mongoose.isValidObjectId(templateId)) {
    throw new ValidationError('Invalid template id');
  }

  const template = await MasterTemplate.findById(templateId);
  if (!template) {
    throw new NotFoundError('Template not found');
  }

  if (!template.isGlobal && template.departmentId) {
    ensureDepartmentScope(req, template.departmentId.toString(), 'Access denied for this template');
  }
  if (template.isGlobal && !isSystemAdmin(req)) {
    throw new AuthorizationError('Only system admins can publish global templates');
  }

  const { name, description, css, layout, status } = req.body as {
    name?: string;
    description?: string;
    css?: string;
    layout?: { grid?: string; regions: Array<{ id: string; kind: 'scorm' | 'custom'; title: string }> };
    status?: 'draft' | 'published' | 'archived';
  };

  if (layout) {
    normalizeRegions(template.type, layout.regions || []);
    template.layout = layout as any;
  }

  if (name !== undefined) template.name = name;
  if (description !== undefined) template.description = description;

  if (css !== undefined) {
    template.css = css;
    const deptId = template.departmentId ? template.departmentId.toString() : null;
    if (deptId) {
      const master = await resolveMasterCss(deptId);
      const score = scoreCss(master.css, css, master.version);
      template.score = {
        value: score.value,
        comparedToVersion: score.comparedToVersion,
        diffs: score.diffs,
      } as any;
      template.overrideStatus = css.length > 0 ? (isSystemAdmin(req) ? 'approved' : 'pending') : 'inherited';
    }
  }

  if (status !== undefined) {
    template.status = status;
  }

  await template.save();
  const passingStyleScore = await resolvePassingStyleScore(
    template.departmentId ? template.departmentId.toString() : null
  );

  res.status(200).json({
    status: 'success',
    data: {
      id: template._id.toString(),
      name: template.name,
      description: template.description,
      type: template.type,
      status: template.status,
      departmentId: template.departmentId ? template.departmentId.toString() : null,
      isGlobal: template.isGlobal,
      css: template.css,
      layout: template.layout,
      score: formatScore(template.score as any, passingStyleScore),
      overrideStatus: template.overrideStatus,
      createdBy: template.createdBy.toString(),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    },
  });
});

export const publishTemplate = asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params.id;
  if (!mongoose.isValidObjectId(templateId)) {
    throw new ValidationError('Invalid template id');
  }

  const template = await MasterTemplate.findById(templateId);
  if (!template) {
    throw new NotFoundError('Template not found');
  }

  if (!template.isGlobal && template.departmentId) {
    ensureDepartmentScope(req, template.departmentId.toString(), 'Access denied for this template');
  }
  if (template.isGlobal && !isSystemAdmin(req)) {
    throw new AuthorizationError('Only system admins can archive global templates');
  }

  if (template.overrideStatus === 'pending') {
    throw new ValidationError('Template override requires approval before publishing');
  }

  template.status = 'published';
  await template.save();

  res.status(200).json({
    status: 'success',
    message: 'Template published successfully',
    data: { id: template._id.toString(), status: template.status },
  });
});

export const archiveTemplate = asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params.id;
  if (!mongoose.isValidObjectId(templateId)) {
    throw new ValidationError('Invalid template id');
  }

  const template = await MasterTemplate.findById(templateId);
  if (!template) {
    throw new NotFoundError('Template not found');
  }

  if (!template.isGlobal && template.departmentId) {
    ensureDepartmentScope(req, template.departmentId.toString(), 'Access denied for this template');
  }

  template.status = 'archived';
  await template.save();

  res.status(200).json({
    status: 'success',
    message: 'Template archived successfully',
    data: { id: template._id.toString(), status: template.status },
  });
});
