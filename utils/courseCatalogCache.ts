import redisClient from '../config/redis';
import ProgramLevel from '../model/Academic/ProgramLevel';

type CourseCatalogEntry = {
  courseId: string;
  programLevelId?: string | null;
};

const DEFAULT_TTL_SECONDS = Number(process.env.COURSE_CATALOG_CACHE_TTL || 300);
const useMemoryCache =
  process.env.COURSE_CATALOG_CACHE_DRIVER === 'memory' || process.env.NODE_ENV === 'test';
const shouldLog = process.env.COURSE_CATALOG_CACHE_DEBUG === 'true';

const memoryCache = new Map<string, { expiresAt: number; payload: CourseCatalogEntry[] }>();

const cacheKey = (programId: string) => `course-catalog:${programId}`;

const isExpired = (entry: { expiresAt: number }) => entry.expiresAt <= Date.now();

const getCached = async (key: string): Promise<CourseCatalogEntry[] | null> => {
  if (useMemoryCache) {
    const entry = memoryCache.get(key);
    if (!entry || isExpired(entry)) {
      if (entry) {
        memoryCache.delete(key);
      }
      return null;
    }
    return entry.payload;
  }

  if (redisClient.status !== 'ready') {
    return null;
  }

  const payload = await redisClient.get(key);
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(payload) as CourseCatalogEntry[];
  } catch {
    return null;
  }
};

const setCached = async (key: string, payload: CourseCatalogEntry[]): Promise<void> => {
  if (useMemoryCache) {
    memoryCache.set(key, { expiresAt: Date.now() + DEFAULT_TTL_SECONDS * 1000, payload });
    return;
  }

  if (redisClient.status !== 'ready') {
    return;
  }

  await redisClient.setex(key, DEFAULT_TTL_SECONDS, JSON.stringify(payload));
};

export const buildProgramCatalog = async (programId: string): Promise<CourseCatalogEntry[]> => {
  const levels = await ProgramLevel.find({ program: programId })
    .select('courses')
    .lean();
  const entries: CourseCatalogEntry[] = [];
  levels.forEach((level: any) => {
    (level.courses || []).forEach((courseId: any) => {
      entries.push({
        courseId: courseId.toString(),
        programLevelId: level._id?.toString(),
      });
    });
  });
  return entries;
};

export const getProgramCourseCatalog = async (
  programId: string
): Promise<{ entries: CourseCatalogEntry[]; fromCache: boolean }> => {
  const key = cacheKey(programId);
  const cached = await getCached(key);
  if (cached) {
    if (shouldLog) {
      console.log(`Course catalog cache hit for program ${programId}`);
    }
    return { entries: cached, fromCache: true };
  }

  const entries = await buildProgramCatalog(programId);
  await setCached(key, entries);
  if (shouldLog) {
    console.log(`Course catalog cache miss for program ${programId}`);
  }
  return { entries, fromCache: false };
};

export const invalidateProgramCatalog = async (programId: string): Promise<void> => {
  const key = cacheKey(programId);
  if (useMemoryCache) {
    memoryCache.delete(key);
    return;
  }

  if (redisClient.status !== 'ready') {
    return;
  }

  await redisClient.del(key);
};

export const invalidateProgramCatalogs = async (programIds: string[]): Promise<void> => {
  const uniqueIds = Array.from(new Set(programIds.filter(Boolean)));
  if (uniqueIds.length === 0) return;

  if (useMemoryCache) {
    uniqueIds.forEach((id) => memoryCache.delete(cacheKey(id)));
    return;
  }

  if (redisClient.status !== 'ready') {
    return;
  }

  await redisClient.del(...uniqueIds.map((id) => cacheKey(id)));
};

export const courseCatalogCacheConfig = {
  driver: useMemoryCache ? 'memory' : 'redis',
  ttlSeconds: DEFAULT_TTL_SECONDS,
};
