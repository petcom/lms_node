/**
 * SCORM Session Manager
 * 
 * Manages active SCORM sessions including:
 * - Session creation and initialization
 * - Heartbeat tracking
 * - Timeout detection
 * - Session cleanup
 */

import mongoose from 'mongoose';

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
 * In-memory session store
 * In production, consider using Redis for distributed sessions
 */
const sessions: Map<string, ScormSession> = new Map();

/**
 * Session timeout in milliseconds (30 minutes default)
 */
const SESSION_TIMEOUT = parseInt(process.env.SCORM_SESSION_TIMEOUT || '1800000', 10);

/**
 * Create a new SCORM session
 */
export async function createSession(
  attemptId: string,
  userId: mongoose.Types.ObjectId
): Promise<ScormSession> {
  // Check if session already exists
  if (sessions.has(attemptId)) {
    throw new Error('Session already initialized');
  }

  const session: ScormSession = {
    attemptId,
    userId,
    startedAt: new Date(),
    lastActivity: new Date(),
    status: 'active',
    pendingCMI: {},
    errorCode: '0',
  };

  sessions.set(attemptId, session);
  
  return session;
}

/**
 * Get active session
 */
export async function getSession(attemptId: string): Promise<ScormSession | null> {
  const session = sessions.get(attemptId);
  
  if (!session) {
    return null;
  }
  
  // Check if session has timed out
  if (checkTimeout(attemptId)) {
    await terminateSession(attemptId, 'timeout');
    return null;
  }
  
  return session;
}

/**
 * Update session heartbeat
 */
export async function updateHeartbeat(attemptId: string): Promise<boolean> {
  const session = sessions.get(attemptId);
  
  if (!session || session.status !== 'active') {
    return false;
  }
  
  session.lastActivity = new Date();
  return true;
}

/**
 * Check if session has timed out
 */
export function checkTimeout(attemptId: string): boolean {
  const session = sessions.get(attemptId);
  
  if (!session) {
    return false;
  }
  
  const now = new Date().getTime();
  const lastActivity = session.lastActivity.getTime();
  const elapsed = now - lastActivity;
  
  return elapsed > SESSION_TIMEOUT;
}

/**
 * Add pending CMI data to session
 */
export async function addPendingCMI(
  attemptId: string,
  element: string,
  value: any
): Promise<void> {
  const session = sessions.get(attemptId);
  
  if (!session) {
    throw new Error('Session not initialized');
  }
  
  session.pendingCMI[element] = value;
  session.lastActivity = new Date();
}

/**
 * Get pending CMI data
 */
export async function getPendingCMI(attemptId: string): Promise<Record<string, any>> {
  const session = sessions.get(attemptId);
  
  if (!session) {
    return {};
  }
  
  return { ...session.pendingCMI };
}

/**
 * Clear pending CMI data (after commit)
 */
export async function clearPendingCMI(attemptId: string): Promise<void> {
  const session = sessions.get(attemptId);
  
  if (session) {
    session.pendingCMI = {};
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
  const session = sessions.get(attemptId);
  
  if (session) {
    session.errorCode = errorCode;
    session.errorMessage = errorMessage;
  }
}

/**
 * Get session error
 */
export async function getSessionError(attemptId: string): Promise<{ code: string; message?: string }> {
  const session = sessions.get(attemptId);
  
  if (!session) {
    return { code: '0' };
  }
  
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
  const session = sessions.get(attemptId);
  
  if (session) {
    session.status = reason === 'timeout' ? 'timeout' : 'terminated';
    
    // Remove from active sessions after a delay (for final data retrieval)
    setTimeout(() => {
      sessions.delete(attemptId);
    }, 60000); // Keep for 1 minute after termination
  }
}

/**
 * Auto-commit stale sessions (background job)
 * This should be called periodically (e.g., every 5 minutes)
 */
export async function autoCommitStale(): Promise<string[]> {
  const staleAttempts: string[] = [];
  
  for (const [attemptId, session] of sessions.entries()) {
    if (session.status === 'active' && checkTimeout(attemptId)) {
      staleAttempts.push(attemptId);
      
      // Mark as timeout but don't delete yet (give chance to commit)
      session.status = 'timeout';
    }
  }
  
  return staleAttempts;
}

/**
 * Get session statistics
 */
export function getSessionStats(): {
  total: number;
  active: number;
  terminated: number;
  timeout: number;
} {
  const stats = {
    total: sessions.size,
    active: 0,
    terminated: 0,
    timeout: 0,
  };
  
  for (const session of sessions.values()) {
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
export function clearAllSessions(): void {
  sessions.clear();
}
