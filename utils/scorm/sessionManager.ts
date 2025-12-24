/**
 * SCORM Session Manager
 * 
 * Manages active SCORM sessions including:
 * - Session creation and initialization
 * - Heartbeat tracking
 * - Timeout detection
 * - Session cleanup
 * 
 * Uses Redis for persistent session storage across server restarts
 * and multi-instance deployments
 */

import mongoose from 'mongoose';
import redisClient from '../../config/redis';

/**
 * Session data structure
 */
export interface ScormSession {
  attemptId: string;
  userId: mongoose.Types.ObjectId;
  startedAt: Date;
  lastActivity: Date;
  status: 'active' | 'terminated' | 'timeout';
  pendingCMI: Record<string, any>;
  errorCode: string;
  errorMessage?: string;
}

/**
 * Session timeout in seconds (30 minutes default)
 */
const SESSION_TIMEOUT = parseInt(process.env.SCORM_SESSION_TIMEOUT || '1800', 10);

/**
 * Redis key prefixes
 */
const SESSION_KEY_PREFIX = 'scorm:session:';

/**
 * Ensure Redis is ready before attempting commands.
 * If Redis is down or still connecting, fail fast to avoid hung requests.
 */
function ensureRedisReady() {
  if (redisClient.status !== 'ready') {
    throw new Error('Redis not ready');
  }
}

/**
 * Helper to serialize session for Redis
 */
function serializeSession(session: Omit<ScormSession, 'attemptId'>): string {
  return JSON.stringify({
    ...session,
    userId: session.userId.toString(),
    startedAt: session.startedAt.toISOString(),
    lastActivity: session.lastActivity.toISOString(),
  });
}

/**
 * Helper to deserialize session from Redis
 */
function deserializeSession(attemptId: string, data: string): ScormSession {
  const parsed = JSON.parse(data);
  return {
    attemptId,
    userId: new mongoose.Types.ObjectId(parsed.userId),
    startedAt: new Date(parsed.startedAt),
    lastActivity: new Date(parsed.lastActivity),
    status: parsed.status,
    pendingCMI: parsed.pendingCMI || {},
    errorCode: parsed.errorCode || '0',
    errorMessage: parsed.errorMessage,
  };
}

/**
 * Create a new SCORM session
 */
export async function createSession(
  attemptId: string,
  userId: mongoose.Types.ObjectId
): Promise<ScormSession> {
  ensureRedisReady();

  // Check if session already exists
  const exists = await redisClient.exists(`${SESSION_KEY_PREFIX}${attemptId}`);
  if (exists) {
    throw new Error('Session already initialized');
  }

  const session: Omit<ScormSession, 'attemptId'> = {
    userId,
    startedAt: new Date(),
    lastActivity: new Date(),
    status: 'active',
    pendingCMI: {},
    errorCode: '0',
  };

  // Store in Redis with TTL
  await redisClient.setex(
    `${SESSION_KEY_PREFIX}${attemptId}`,
    SESSION_TIMEOUT,
    serializeSession(session)
  );
  
  return { attemptId, ...session };
}

/**
 * Get active session
 */
export async function getSession(attemptId: string): Promise<ScormSession | null> {
  ensureRedisReady();

  const data = await redisClient.get(`${SESSION_KEY_PREFIX}${attemptId}`);
  
  if (!data) {
    return null;
  }
  
  const session = deserializeSession(attemptId, data);
  
  // Check if session has timed out (TTL check)
  const ttl = await redisClient.ttl(`${SESSION_KEY_PREFIX}${attemptId}`);
  if (ttl <= 0) {
    await terminateSession(attemptId, 'timeout');
    return null;
  }
  
  return session;
}

/**
 * Update session heartbeat
 */
export async function updateHeartbeat(attemptId: string): Promise<boolean> {
  ensureRedisReady();

  const data = await redisClient.get(`${SESSION_KEY_PREFIX}${attemptId}`);
  
  if (!data) {
    return false;
  }
  
  const session = deserializeSession(attemptId, data);
  
  if (session.status !== 'active') {
    return false;
  }
  
  // Update last activity and refresh TTL
  session.lastActivity = new Date();
  await redisClient.setex(
    `${SESSION_KEY_PREFIX}${attemptId}`,
    SESSION_TIMEOUT,
    serializeSession(session)
  );
  
  return true;
}

/**
 * Check if session has timed out
 */
export async function checkTimeout(attemptId: string): Promise<boolean> {
  ensureRedisReady();

  const ttl = await redisClient.ttl(`${SESSION_KEY_PREFIX}${attemptId}`);
  return ttl <= 0;
}

/**
 * Add pending CMI data to session
 */
export async function addPendingCMI(
  attemptId: string,
  element: string,
  value: any
): Promise<void> {
  ensureRedisReady();

  const data = await redisClient.get(`${SESSION_KEY_PREFIX}${attemptId}`);
  
  if (!data) {
    throw new Error('Session not initialized');
  }
  
  const session = deserializeSession(attemptId, data);
  session.pendingCMI[element] = value;
  session.lastActivity = new Date();
  
  // Update session in Redis
  await redisClient.setex(
    `${SESSION_KEY_PREFIX}${attemptId}`,
    SESSION_TIMEOUT,
    serializeSession(session)
  );
}

/**
 * Get pending CMI data
 */
export async function getPendingCMI(attemptId: string): Promise<Record<string, any>> {
  ensureRedisReady();

  const data = await redisClient.get(`${SESSION_KEY_PREFIX}${attemptId}`);
  
  if (!data) {
    return {};
  }
  
  const session = deserializeSession(attemptId, data);
  return { ...session.pendingCMI };
}

/**
 * Clear pending CMI data (after commit)
 */
export async function clearPendingCMI(attemptId: string): Promise<void> {
  ensureRedisReady();

  const data = await redisClient.get(`${SESSION_KEY_PREFIX}${attemptId}`);
  
  if (data) {
    const session = deserializeSession(attemptId, data);
    session.pendingCMI = {};
    
    await redisClient.setex(
      `${SESSION_KEY_PREFIX}${attemptId}`,
      SESSION_TIMEOUT,
      serializeSession(session)
    );
  }
}

/**
 * Set session error
 */
export async function setSessionError(
  attemptId: string,
  errorCode: string,
  errorMessage?: string
): Promise<void> {
  ensureRedisReady();

  const data = await redisClient.get(`${SESSION_KEY_PREFIX}${attemptId}`);
  
  if (data) {
    const session = deserializeSession(attemptId, data);
    session.errorCode = errorCode;
    session.errorMessage = errorMessage;
    
    await redisClient.setex(
      `${SESSION_KEY_PREFIX}${attemptId}`,
      SESSION_TIMEOUT,
      serializeSession(session)
    );
  }
}

/**
 * Get session error
 */
export async function getSessionError(attemptId: string): Promise<{ code: string; message?: string }> {
  ensureRedisReady();

  const data = await redisClient.get(`${SESSION_KEY_PREFIX}${attemptId}`);
  
  if (!data) {
    return { code: '0' };
  }
  
  const session = deserializeSession(attemptId, data);
  return {
    code: session.errorCode,
    message: session.errorMessage,
  };
}

/**
 * Terminate session
 */
export async function terminateSession(
  attemptId: string,
  reason: 'normal' | 'timeout' = 'normal'
): Promise<void> {
  ensureRedisReady();

  const data = await redisClient.get(`${SESSION_KEY_PREFIX}${attemptId}`);
  
  if (data) {
    const session = deserializeSession(attemptId, data);
    session.status = reason === 'timeout' ? 'timeout' : 'terminated';
    
    // Keep session for 1 minute for final data retrieval, then auto-delete via TTL
    await redisClient.setex(
      `${SESSION_KEY_PREFIX}${attemptId}`,
      60, // 1 minute
      serializeSession(session)
    );
  }
}

/**
 * Auto-commit stale sessions (background job)
 * This should be called periodically (e.g., every 5 minutes)
 */
export async function autoCommitStale(): Promise<string[]> {
  ensureRedisReady();

  const staleAttempts: string[] = [];
  
  // Scan for all session keys
  const keys = await redisClient.keys(`${SESSION_KEY_PREFIX}*`);
  
  for (const key of keys) {
    const data = await redisClient.get(key);
    if (!data) continue;
    
    const attemptId = key.replace(SESSION_KEY_PREFIX, '');
    const session = deserializeSession(attemptId, data);
    
    // Check if session is about to timeout (TTL < 5 minutes)
    const ttl = await redisClient.ttl(key);
    if (session.status === 'active' && ttl > 0 && ttl < 300) {
      staleAttempts.push(attemptId);
      
      // Mark as timeout but keep data
      session.status = 'timeout';
      await redisClient.setex(key, ttl, serializeSession(session));
    }
  }
  
  return staleAttempts;
}

/**
 * Get session statistics
 */
export async function getSessionStats(): Promise<{
  total: number;
  active: number;
  terminated: number;
  timeout: number;
}> {
  ensureRedisReady();

  const stats = {
    total: 0,
    active: 0,
    terminated: 0,
    timeout: 0,
  };
  
  // Scan for all session keys
  const keys = await redisClient.keys(`${SESSION_KEY_PREFIX}*`);
  stats.total = keys.length;
  
  for (const key of keys) {
    const data = await redisClient.get(key);
    if (!data) continue;
    
    const attemptId = key.replace(SESSION_KEY_PREFIX, '');
    const session = deserializeSession(attemptId, data);
    
    switch (session.status) {
      case 'active':
        stats.active++;
        break;
      case 'terminated':
        stats.terminated++;
        break;
      case 'timeout':
        stats.timeout++;
        break;
    }
  }
  
  return stats;
}

/**
 * Clear all sessions (for testing/maintenance)
 */
export async function clearAllSessions(): Promise<void> {
  ensureRedisReady();

  const keys = await redisClient.keys(`${SESSION_KEY_PREFIX}*`);
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
}
