/**
 * Session Rotation Utilities
 *
 * Provides secure session rotation for authentication state changes.
 * Prevents session fixation and hijacking attacks.
 *
 * **When to Rotate Sessions**:
 * - Password changes
 * - MFA enabled/disabled
 * - Role or permission changes
 * - Account recovery
 * - Privilege escalation
 *
 * **Security Model**:
 * - Invalidates all existing sessions
 * - Forces re-authentication
 * - Logs rotation for audit trail
 */

import { serviceDb as db, authSessions } from '@platform/db';
import { createModuleLogger } from '../utils/logger';
import { eq } from 'drizzle-orm';

const logger = createModuleLogger('session-rotation');

/**
 * Rotate all sessions for a user
 *
 * **Security Critical**: This function invalidates ALL sessions for a user,
 * forcing them to re-authenticate. Use when authentication state changes
 * in a security-significant way.
 *
 * @param userId - User ID whose sessions should be rotated
 * @param reason - Reason for rotation (for audit logging)
 * @returns Number of sessions invalidated
 *
 * @example
 * ```typescript
 * // After password change
 * await rotateUserSessions(userId, 'password_change');
 *
 * // After MFA enabled
 * await rotateUserSessions(userId, 'mfa_enabled');
 *
 * // After role change
 * await rotateUserSessions(userId, 'role_change');
 * ```
 */
export async function rotateUserSessions(
  userId: string,
  reason: 'password_change' | 'mfa_enabled' | 'mfa_disabled' | 'role_change' | 'account_recovery' | 'privilege_escalation'
): Promise<number> {
  try {
    // Get count of sessions to be invalidated (for logging)
    const existingSessions = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.userId, userId));

    const sessionCount = existingSessions.length;

    // Delete all sessions for this user
    await db.delete(authSessions).where(eq(authSessions.userId, userId));

    logger.info('Session rotation completed', {
      userId,
      reason,
      sessionsInvalidated: sessionCount,
      timestamp: new Date().toISOString(),
    });

    return sessionCount;
  } catch (error) {
    logger.error('Session rotation failed', {
      userId,
      reason,
      error,
    });
    throw error;
  }
}

/**
 * Invalidate a specific session token
 *
 * Use when you need to invalidate a single session rather than all sessions.
 * Less disruptive than full rotation.
 *
 * @param sessionToken - Session token to invalidate
 * @returns True if session was found and invalidated
 *
 * @example
 * ```typescript
 * // Invalidate current session (logout)
 * await invalidateSession(sessionToken);
 * ```
 */
export async function invalidateSession(sessionToken: string): Promise<boolean> {
  try {
    // Check if session exists
    const existingSession = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.sessionToken, sessionToken))
      .limit(1);

    if (existingSession.length === 0) {
      return false;
    }

    // Delete the session
    await db
      .delete(authSessions)
      .where(eq(authSessions.sessionToken, sessionToken));

    logger.info('Session invalidated', {
      sessionToken: sessionToken.substring(0, 12) + '...',
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    logger.error('Session invalidation failed', {
      sessionToken: sessionToken.substring(0, 12) + '...',
      error,
    });
    throw error;
  }
}

/**
 * Invalidate all sessions except the current one
 *
 * Use when user wants to logout from all other devices but keep current session.
 * Common in "logout everywhere else" features.
 *
 * @param userId - User ID whose sessions should be invalidated
 * @param currentSessionToken - Session token to preserve
 * @returns Number of sessions invalidated
 *
 * @example
 * ```typescript
 * // Logout from all other devices
 * await invalidateOtherSessions(userId, currentSessionToken);
 * ```
 */
export async function invalidateOtherSessions(
  userId: string,
  currentSessionToken: string
): Promise<number> {
  try {
    // Get all sessions except current
    const otherSessions = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.userId, userId));

    const sessionsToInvalidate = otherSessions.filter(
      (session) => session.sessionToken !== currentSessionToken
    );

    // Delete other sessions
    for (const session of sessionsToInvalidate) {
      await db
        .delete(authSessions)
        .where(eq(authSessions.sessionToken, session.sessionToken));
    }

    logger.info('Other sessions invalidated', {
      userId,
      currentSessionToken: currentSessionToken.substring(0, 12) + '...',
      sessionsInvalidated: sessionsToInvalidate.length,
      timestamp: new Date().toISOString(),
    });

    return sessionsToInvalidate.length;
  } catch (error) {
    logger.error('Invalidate other sessions failed', {
      userId,
      error,
    });
    throw error;
  }
}
