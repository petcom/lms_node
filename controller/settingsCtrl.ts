import { Request, Response } from 'express';
import AsyncHandler from 'express-async-handler';
import Settings from '../model/System/Settings';

const DEFAULT_SETTINGS = {
  scope: 'global' as const,
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    overrides: {},
  },
};

export const getSettings = AsyncHandler(async (_req: Request, res: Response): Promise<void> => {
  let settings = await Settings.findOne({ scope: 'global' }).lean();
  if (!settings) {
    const created = await Settings.create(DEFAULT_SETTINGS);
    settings = created.toObject();
  }

  res.status(200).json({
    status: 'success',
    data: settings,
  });
});

export const updateSettings = AsyncHandler(async (req: Request, res: Response): Promise<void> => {
  const existing = await Settings.findOne({ scope: 'global' });
  const base = existing?.toObject() || DEFAULT_SETTINGS;
  const pagination = {
    ...base.pagination,
    ...req.body?.pagination,
    overrides: {
      ...(base.pagination?.overrides || {}),
      ...(req.body?.pagination?.overrides || {}),
    },
  };

  const settings = await Settings.findOneAndUpdate(
    { scope: 'global' },
    {
      scope: 'global',
      pagination,
      updatedBy: req.userAuth?._id,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  res.status(200).json({
    status: 'success',
    message: 'Settings updated',
    data: settings,
  });
});
