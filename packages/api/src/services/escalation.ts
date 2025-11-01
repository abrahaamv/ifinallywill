/**
 * Escalation Service
 * Human agent notification and meeting URL generation
 * Phase 11 Week 4
 */

import { randomBytes } from 'crypto';
import { addHours } from 'date-fns';
import { eq, and, desc, isNull, escalations, sessions, endUsers, type DrizzleClient } from '@platform/db';
import type { Redis } from 'ioredis';

interface CreateEscalationParams {
  sessionId: string;
  reason: string;
  withinServiceHours: boolean;
  escalationType?: 'ai_failure' | 'time_exceeded' | 'duplicate_problem' | 'user_request';
  problemId?: string;
  metadata?: Record<string, any>;
}

interface EscalationNotification {
  type: 'new_escalation';
  escalationId: string;
  sessionId: string;
  endUserName?: string;
  endUserPhone?: string;
  endUserEmail?: string;
  priority: string;
  reason: string;
  meetingUrl: string;
  createdAt: Date;
}

/**
 * Create escalation and notify human agents
 */
export async function createEscalation(
  db: DrizzleClient,
  redis: Redis,
  params: CreateEscalationParams
): Promise<string> {
  const {
    sessionId,
    reason,
    withinServiceHours,
    escalationType = 'ai_failure',
    problemId,
    metadata = {},
  } = params;

  // Get session details
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Get end user details if exists
  let endUser = null;
  if (session.endUserId) {
    endUser = await db.query.endUsers.findFirst({
      where: eq(endUsers.id, session.endUserId),
    });
  }

  // Generate meeting token and URL
  const meetingToken = randomBytes(16).toString('hex');
  const meetingUrl = `${process.env.APP_URL || 'https://platform.com'}/meet/${meetingToken}`;

  // Create escalation
  const result = await db.insert(escalations).values({
    tenantId: session.tenantId,
    sessionId,
    endUserId: session.endUserId,
    reason,
    escalationType,
    problemId,
    withinServiceHours,
    meetingUrl,
    meetingToken,
    escalationMetadata: metadata,
    scheduledFollowupAt: withinServiceHours ? null : addHours(new Date(), 24),
  }).returning();

  const escalation = result[0];
  if (!escalation) {
    throw new Error('Failed to create escalation');
  }

  console.log(`Created escalation ${escalation.id} for session ${sessionId}`);

  // Notify human agents if within service hours
  if (withinServiceHours) {
    await notifyAvailableAgents(redis, session.tenantId, {
      type: 'new_escalation',
      escalationId: escalation.id,
      sessionId,
      endUserName: endUser?.name ?? undefined,
      endUserPhone: endUser?.phoneNumber ?? undefined,
      endUserEmail: endUser?.email ?? undefined,
      priority: escalationType === 'ai_failure' ? 'high' : 'medium',
      reason,
      meetingUrl,
      createdAt: new Date(),
    });
  }

  return escalation.id;
}

/**
 * Notify all online agents for tenant
 * Uses Redis Streams for real-time notifications
 */
async function notifyAvailableAgents(
  redis: Redis,
  tenantId: string,
  notification: EscalationNotification
): Promise<void> {
  // Get all online agents for this tenant
  const onlineAgents = await redis.smembers(`tenant:${tenantId}:online_agents`);

  if (onlineAgents.length === 0) {
    console.warn(`No online agents found for tenant ${tenantId}`);
    return;
  }

  console.log(`Notifying ${onlineAgents.length} online agents for tenant ${tenantId}`);

  // Publish notification to each agent's stream
  for (const agentId of onlineAgents) {
    await redis.xadd(
      `agent:${agentId}:notifications`,
      '*',
      'data',
      JSON.stringify(notification)
    );
  }

  // Also publish to tenant-wide stream for dashboard
  await redis.xadd(
    `tenant:${tenantId}:escalations`,
    '*',
    'data',
    JSON.stringify(notification)
  );
}

/**
 * Mark escalation as joined by human agent
 */
export async function joinEscalation(
  db: DrizzleClient,
  escalationId: string,
  humanAgentId: string
): Promise<void> {
  await db.update(escalations)
    .set({
      humanAgentId,
      assignedAt: new Date(),
      humanAgentJoinedAt: new Date(),
    })
    .where(eq(escalations.id, escalationId));

  console.log(`Agent ${humanAgentId} joined escalation ${escalationId}`);
}

/**
 * Complete escalation
 */
export async function completeEscalation(
  db: DrizzleClient,
  escalationId: string,
  resolutionNotes: string,
  meetingDurationSeconds?: number
): Promise<void> {
  await db.update(escalations)
    .set({
      resolvedAt: new Date(),
      resolutionNotes,
      meetingDurationSeconds,
    })
    .where(eq(escalations.id, escalationId));

  console.log(`Escalation ${escalationId} completed`);
}

/**
 * Get pending escalations for tenant
 */
export async function getPendingEscalations(
  db: DrizzleClient,
  tenantId: string
): Promise<any[]> {
  // Get escalations that are not yet resolved
  return await db.query.escalations.findMany({
    where: and(
      eq(escalations.tenantId, tenantId),
      isNull(escalations.resolvedAt)
    ),
    with: {
      session: true,
      endUser: true,
    },
    orderBy: [desc(escalations.createdAt)],
  });
}

/**
 * Mark agent as online
 */
export async function markAgentOnline(
  redis: Redis,
  tenantId: string,
  agentId: string
): Promise<void> {
  await redis.sadd(`tenant:${tenantId}:online_agents`, agentId);
  console.log(`Agent ${agentId} marked online for tenant ${tenantId}`);
}

/**
 * Mark agent as offline
 */
export async function markAgentOffline(
  redis: Redis,
  tenantId: string,
  agentId: string
): Promise<void> {
  await redis.srem(`tenant:${tenantId}:online_agents`, agentId);
  console.log(`Agent ${agentId} marked offline for tenant ${tenantId}`);
}
