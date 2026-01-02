import Settings from '../model/System/Settings';
import { ISettings } from '../types/models-types';

const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_LIMIT = 100;

type PaginationOverride = {
  limit?: number;
  maxLimit?: number;
};

type PaginationSettings = {
  defaultLimit?: number;
  maxLimit?: number;
  overrides?: Record<string, PaginationOverride>;
};

type PaginationResolveInput = {
  settings?: ISettings | null;
  resourceKey?: string;
  limitParam?: any;
};

export const computePagination = ({
  settings,
  resourceKey,
  limitParam,
}: PaginationResolveInput): { limit: number; maxLimit: number } => {
  const pagination = settings?.pagination as PaginationSettings | undefined;
  const overrides = pagination?.overrides || {};
  const override = resourceKey ? overrides[resourceKey] : undefined;

  const defaultLimit = pagination?.defaultLimit ?? DEFAULT_LIMIT;
  const maxLimit = override?.maxLimit ?? pagination?.maxLimit ?? DEFAULT_MAX_LIMIT;

  const parsedLimit = Number(limitParam);
  const candidate =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : override?.limit ?? defaultLimit;

  return {
    limit: Math.min(candidate, maxLimit),
    maxLimit,
  };
};

export const resolvePagination = async (
  resourceKey: string | undefined,
  limitParam: any
): Promise<{ limit: number; maxLimit: number }> => {
  const settings = await Settings.findOne({ scope: 'global' }).lean<ISettings | null>();
  return computePagination({ settings, resourceKey, limitParam });
};

export const normalizePage = (pageParam: any): number => {
  const page = Number(pageParam);
  return Number.isFinite(page) && page > 0 ? page : 1;
};
