/**
 * Problem Deduplication Service
 * Semantic similarity detection to prevent duplicate unresolved problems
 * Phase 11 Week 4
 */

import { createHash } from 'crypto';
import { sql, eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { unresolvedProblems, unresolvedProblemUsers } from '@platform/db';
import { createVoyageProvider } from './embeddings';
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('problem-deduplication');

interface SimilarProblemResult {
  exists: boolean;
  problemId?: string;
  similarity?: number;
  affectedUserCount?: number;
  status?: string;
}

interface UnresolvedProblemData {
  tenantId: string;
  endUserId: string;
  sessionId: string;
  problemDescription: string;
}

interface ProblemQueryResult {
  id: string;
  problem_description: string;
  affected_user_count: number;
  status: string;
  similarity: number;
}

/**
 * Check if a similar problem already exists
 * Uses vector cosine similarity with pgvector
 */
export async function checkForSimilarProblem<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
  tenantId: string,
  problemDescription: string,
  threshold: number = 0.85
): Promise<SimilarProblemResult> {
  // Generate embedding for problem description
  const voyageProvider = createVoyageProvider();
  const embedding = await voyageProvider.embed(problemDescription);

  // Find similar problems using cosine similarity
  // 1 - (embedding <=> query) gives cosine similarity (higher = more similar)
  const results = await db.execute(sql`
    SELECT
      id,
      problem_description,
      affected_user_count,
      status,
      1 - (problem_embedding <=> ${embedding}::vector) as similarity
    FROM ${unresolvedProblems}
    WHERE tenant_id = ${tenantId}
      AND status = 'unresolved'
      AND 1 - (problem_embedding <=> ${embedding}::vector) > ${threshold}
    ORDER BY similarity DESC
    LIMIT 1
  `);

  // postgres.js returns results directly as array, not wrapped in .rows
  const rows = results as unknown as ProblemQueryResult[];
  if (rows.length > 0 && rows[0]) {
    const problem = rows[0];
    return {
      exists: true,
      problemId: problem.id,
      similarity: problem.similarity,
      affectedUserCount: problem.affected_user_count,
      status: problem.status,
    };
  }

  return { exists: false };
}

/**
 * Create or update unresolved problem
 * Deduplicates based on semantic similarity
 */
export async function createOrUpdateUnresolvedProblem<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
  data: UnresolvedProblemData
): Promise<string> {
  const { tenantId, endUserId, sessionId, problemDescription } = data;

  // Check for similar problem
  const similar = await checkForSimilarProblem(db, tenantId, problemDescription);

  if (similar.exists && similar.problemId) {
    // Update existing problem
    await db.update(unresolvedProblems)
      .set({
        affectedUserCount: sql`${unresolvedProblems.affectedUserCount} + 1`,
        attemptCount: sql`${unresolvedProblems.attemptCount} + 1`,
        lastSessionId: sessionId,
        updatedAt: new Date(),
      })
      .where(eq(unresolvedProblems.id, similar.problemId));

    // Add user to blocked list (ignore duplicates)
    await db.insert(unresolvedProblemUsers).values({
      problemId: similar.problemId,
      endUserId,
    }).onConflictDoNothing();

    logger.info('Updated existing problem', {
      problemId: similar.problemId,
      similarity: similar.similarity
    });
    return similar.problemId;
  }

  // Create new problem
  const voyageProvider = createVoyageProvider();
  const embedding = await voyageProvider.embed(problemDescription);
  const hash = createHash('sha256')
    .update(problemDescription.toLowerCase().trim())
    .digest('hex');

  const [newProblem] = await db.insert(unresolvedProblems).values({
    tenantId,
    problemDescription,
    problemEmbedding: embedding,
    problemHash: hash,
    firstSessionId: sessionId,
    lastSessionId: sessionId,
    affectedUserCount: 1,
    attemptCount: 1,
    status: 'unresolved',
  }).returning();

  if (!newProblem) {
    throw new Error('Failed to create unresolved problem');
  }

  // Add user to blocked list
  await db.insert(unresolvedProblemUsers).values({
    problemId: newProblem.id,
    endUserId,
  });

  logger.info('Created new unresolved problem', { problemId: newProblem.id });

  // Queue AI solution generation (background job)
  // This will be implemented in a separate worker process
  await queueSolutionGeneration(newProblem.id);

  return newProblem.id;
}

/**
 * Check if end user is blocked for a specific problem
 */
export async function checkIfUserBlocked<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
  tenantId: string,
  endUserId: string,
  problemDescription: string
): Promise<{
  blocked: boolean;
  problemId?: string;
  affectedUserCount?: number;
  message?: string;
}> {
  // Check for similar problem
  const similar = await checkForSimilarProblem(db, tenantId, problemDescription);

  if (!similar.exists || !similar.problemId) {
    return { blocked: false };
  }

  // Check if user is in blocked list for this problem
  const blockedUser = await db
    .select()
    .from(unresolvedProblemUsers)
    .where(
      and(
        eq(unresolvedProblemUsers.problemId, similar.problemId),
        eq(unresolvedProblemUsers.endUserId, endUserId)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (blockedUser) {
    return {
      blocked: true,
      problemId: similar.problemId,
      affectedUserCount: similar.affectedUserCount,
      message: `We recognize this issue. Our team is working on a solution. ${similar.affectedUserCount} other users have reported the same problem. We'll notify you as soon as it's resolved.`,
    };
  }

  return { blocked: false };
}

/**
 * Queue AI solution generation for unresolved problem
 * This will be processed by a background worker
 */
async function queueSolutionGeneration(problemId: string): Promise<void> {
  // TODO: Implement background job queue (BullMQ, Redis Queue, etc.)
  // For now, just log
  logger.info('[Background Job] Generate AI solution for problem', { problemId });

  // In production, this would:
  // 1. Fetch problem description
  // 2. Search RAG system for similar solved issues
  // 3. Generate solution draft using Claude Sonnet
  // 4. Save draft to generated_solution_draft field
  // 5. Notify admin users for approval
}

/**
 * Approve AI-generated solution and add to knowledge base
 */
export async function approveSolutionDraft<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
  problemId: string,
  approvedBy: string
): Promise<void> {
  // Update problem status
  await db.update(unresolvedProblems)
    .set({
      status: 'rag_updated',
      approvedBy,
      approvedAt: new Date(),
    })
    .where(eq(unresolvedProblems.id, problemId));

  // TODO: Add solution to knowledge base
  // This will create a new knowledge_documents entry
  // and trigger RAG indexing

  // Notify all affected users
  await notifyAffectedUsers(db, problemId);
}

/**
 * Notify all users blocked by this problem
 */
async function notifyAffectedUsers<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
  problemId: string
): Promise<void> {
  // TODO: Implement join with endUsers table to get user contact info
  // For now, just get the problem-user associations
  const affectedUsers = await db
    .select()
    .from(unresolvedProblemUsers)
    .where(eq(unresolvedProblemUsers.problemId, problemId));

  logger.info('Notifying users about problem resolution', {
    userCount: affectedUsers.length
  });

  // TODO: Send notifications via email/SMS
  // Implementation will depend on Phase 11 Week 3 notification services
}
