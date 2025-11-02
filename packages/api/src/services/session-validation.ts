/**
 * Session Validation & Abuse Prevention Service
 * Prevents abuse and ensures quality interactions
 * Phase 11 Week 5
 */

import type { Redis } from 'ioredis';
import { type DrizzleClient, sessions, eq, and, gte } from '@platform/db';
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('session-validation');

interface SessionValidationResult {
  valid: boolean;
  reason?: string;
  blockedUntil?: Date;
  remainingAttempts?: number;
}

interface VideoSessionRequest {
  sessionId: string;
  endUserId: string;
  tenantId: string;
  deviceFingerprint?: string;
}

/**
 * Validate session before allowing video escalation
 *
 * Rules:
 * - Minimum 3 messages required
 * - Maximum 3 video sessions per hour per user
 * - Check if user is blocked
 * - Validate device fingerprint (optional)
 */
export async function validateVideoSessionRequest(
  db: DrizzleClient,
  redis: Redis,
  request: VideoSessionRequest
): Promise<SessionValidationResult> {
  const { sessionId, endUserId, tenantId, deviceFingerprint } = request;

  // 1. Check if user is blocked
  const blockKey = `blocked:user:${tenantId}:${endUserId}`;
  const blockedUntil = await redis.get(blockKey);
  if (blockedUntil) {
    const blockedDate = new Date(blockedUntil);
    if (blockedDate > new Date()) {
      return {
        valid: false,
        reason: 'User is temporarily blocked',
        blockedUntil: blockedDate,
      };
    }
    // Block expired, remove key
    await redis.del(blockKey);
  }

  // 2. Check minimum message requirement (3+ messages)
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, sessionId),
      eq(sessions.tenantId, tenantId)
    ),
    with: {
      messages: true,
    },
  });

  if (!session) {
    return {
      valid: false,
      reason: 'Session not found',
    };
  }

  const messageCount = session.messages?.length || 0;
  if (messageCount < 3) {
    return {
      valid: false,
      reason: `Minimum 3 messages required (current: ${messageCount})`,
    };
  }

  // 3. Check rate limit (max 3 video sessions per hour)
  const rateLimitKey = `rate_limit:video:${tenantId}:${endUserId}`;
  const currentCount = await redis.incr(rateLimitKey);

  if (currentCount === 1) {
    // First request in this hour, set expiry
    await redis.expire(rateLimitKey, 3600); // 1 hour
  }

  const MAX_VIDEO_SESSIONS_PER_HOUR = 3;
  if (currentCount > MAX_VIDEO_SESSIONS_PER_HOUR) {
    // Block user for 1 hour
    const blockUntil = new Date(Date.now() + 3600 * 1000);
    await redis.setex(blockKey, 3600, blockUntil.toISOString());

    return {
      valid: false,
      reason: 'Rate limit exceeded',
      blockedUntil: blockUntil,
      remainingAttempts: 0,
    };
  }

  // 4. Validate device fingerprint (optional anti-abuse)
  if (deviceFingerprint) {
    const fingerprintKey = `fingerprint:${tenantId}:${deviceFingerprint}`;
    const fingerprintCount = await redis.incr(fingerprintKey);

    if (fingerprintCount === 1) {
      await redis.expire(fingerprintKey, 86400); // 24 hours
    }

    const MAX_SESSIONS_PER_FINGERPRINT = 10;
    if (fingerprintCount > MAX_SESSIONS_PER_FINGERPRINT) {
      return {
        valid: false,
        reason: 'Too many sessions from this device',
      };
    }
  }

  // 5. All checks passed
  return {
    valid: true,
    remainingAttempts: MAX_VIDEO_SESSIONS_PER_HOUR - currentCount,
  };
}

/**
 * Track video session start
 * Records session metadata for audit and abuse detection
 */
export async function trackVideoSessionStart(
  redis: Redis,
  params: {
    sessionId: string;
    endUserId: string;
    tenantId: string;
    roomName: string;
    startedAt: Date;
  }
): Promise<void> {
  const { sessionId, endUserId, tenantId, roomName, startedAt } = params;

  // Store session metadata
  const sessionKey = `video_session:${sessionId}`;
  await redis.hset(sessionKey, {
    endUserId,
    tenantId,
    roomName,
    startedAt: startedAt.toISOString(),
    status: 'active',
  });
  await redis.expire(sessionKey, 86400); // 24 hours

  // Track active sessions per tenant
  await redis.sadd(`active_video_sessions:${tenantId}`, sessionId);

  logger.info('Video session started', { sessionId, roomName });
}

/**
 * Track video session end
 * Updates session metadata and cleanup
 */
export async function trackVideoSessionEnd(
  redis: Redis,
  params: {
    sessionId: string;
    tenantId: string;
    endedAt: Date;
    durationMs: number;
    reason: 'completed' | 'abandoned' | 'error';
  }
): Promise<void> {
  const { sessionId, tenantId, endedAt, durationMs, reason } = params;

  // Update session metadata
  const sessionKey = `video_session:${sessionId}`;
  await redis.hset(sessionKey, {
    endedAt: endedAt.toISOString(),
    durationMs: durationMs.toString(),
    status: reason,
  });

  // Remove from active sessions
  await redis.srem(`active_video_sessions:${tenantId}`, sessionId);

  // Track session duration for analytics
  const durationBucket = Math.floor(durationMs / 60000); // Minutes
  await redis.hincrby(
    `video_duration_stats:${tenantId}`,
    durationBucket.toString(),
    1
  );

  logger.info('Video session ended', {
    sessionId,
    reason,
    durationMs
  });
}

/**
 * Block user from video sessions
 * Used for manual blocking or automated abuse detection
 */
export async function blockUserFromVideo(
  redis: Redis,
  params: {
    endUserId: string;
    tenantId: string;
    durationMs: number;
    reason: string;
  }
): Promise<void> {
  const { endUserId, tenantId, durationMs, reason } = params;

  const blockKey = `blocked:user:${tenantId}:${endUserId}`;
  const blockUntil = new Date(Date.now() + durationMs);

  await redis.setex(
    blockKey,
    Math.floor(durationMs / 1000),
    blockUntil.toISOString()
  );

  // Log blocking event
  logger.warn('User blocked from video', {
    userId: endUserId,
    blockedUntil: blockUntil.toISOString(),
    reason
  });
}

/**
 * Get session abuse metrics
 * Returns statistics for abuse monitoring
 */
export async function getSessionAbuseMetrics(
  redis: Redis,
  tenantId: string
): Promise<{
  activeVideoSessions: number;
  blockedUsers: number;
  durationDistribution: Record<string, number>;
}> {
  // Count active video sessions
  const activeSessions = await redis.scard(`active_video_sessions:${tenantId}`);

  // Count blocked users (approximate)
  const blockKeys = await redis.keys(`blocked:user:${tenantId}:*`);
  const blockedUsers = blockKeys.length;

  // Get duration distribution
  const durationStats = await redis.hgetall(`video_duration_stats:${tenantId}`);
  const durationDistribution: Record<string, number> = {};
  for (const [bucket, count] of Object.entries(durationStats)) {
    durationDistribution[`${bucket} minutes`] = parseInt(count, 10);
  }

  return {
    activeVideoSessions: activeSessions,
    blockedUsers,
    durationDistribution,
  };
}

/**
 * Detect suspicious activity patterns
 * Returns true if user behavior indicates potential abuse
 */
export async function detectSuspiciousActivity(
  db: DrizzleClient,
  redis: Redis,
  params: {
    endUserId: string;
    tenantId: string;
  }
): Promise<{
  suspicious: boolean;
  reasons: string[];
  riskScore: number;
}> {
  const { endUserId, tenantId } = params;
  const reasons: string[] = [];
  let riskScore = 0;

  // Check 1: Excessive session creation (>10 in 24 hours)
  const recentSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.endUserId, endUserId),
        eq(sessions.tenantId, tenantId),
        gte(sessions.createdAt, new Date(Date.now() - 86400 * 1000))
      )
    );

  const sessionCountValue = recentSessions.length;
  if (sessionCountValue > 10) {
    reasons.push(`Excessive session creation: ${sessionCountValue} in 24h`);
    riskScore += 0.3;
  }

  // Check 2: Very short video sessions (abandoned quickly)
  const shortSessionKey = `short_sessions:${tenantId}:${endUserId}`;
  const shortSessionCount = parseInt(await redis.get(shortSessionKey) || '0', 10);
  if (shortSessionCount > 3) {
    reasons.push(`Multiple abandoned sessions: ${shortSessionCount}`);
    riskScore += 0.2;
  }

  // Check 3: Same device fingerprint across multiple users
  // This would require storing fingerprints in DB, skipping for now

  // Check 4: Rapid message sending (spam indicator)
  const messageRateKey = `message_rate:${tenantId}:${endUserId}`;
  const messageRate = parseInt(await redis.get(messageRateKey) || '0', 10);
  if (messageRate > 20) {
    reasons.push(`High message rate: ${messageRate} messages/min`);
    riskScore += 0.3;
  }

  // Check 5: Known bad patterns in messages
  // This would require NLP analysis, skipping for now

  const suspicious = riskScore >= 0.5;

  return {
    suspicious,
    reasons,
    riskScore,
  };
}

/**
 * Clean up expired session data
 * Should be run periodically (cron job)
 */
export async function cleanupExpiredSessions(
  redis: Redis,
  tenantId: string
): Promise<{ cleaned: number }> {
  let cleaned = 0;

  // Get all active sessions
  const activeSessions = await redis.smembers(`active_video_sessions:${tenantId}`);

  for (const sessionId of activeSessions) {
    const sessionKey = `video_session:${sessionId}`;
    const sessionData = await redis.hgetall(sessionKey);

    if (!sessionData.startedAt) {
      // Invalid session, remove
      await redis.srem(`active_video_sessions:${tenantId}`, sessionId);
      await redis.del(sessionKey);
      cleaned++;
      continue;
    }

    const startedAt = new Date(sessionData.startedAt);
    const ageMs = Date.now() - startedAt.getTime();

    // If session is older than 4 hours and still "active", mark as abandoned
    if (ageMs > 4 * 3600 * 1000 && sessionData.status === 'active') {
      await redis.hset(sessionKey, 'status', 'abandoned');
      await redis.srem(`active_video_sessions:${tenantId}`, sessionId);
      cleaned++;
    }
  }

  logger.info('Cleaned up expired sessions', {
    cleaned,
    tenantId
  });

  return { cleaned };
}
